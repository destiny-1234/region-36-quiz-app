'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CascadingLocationDropdown, LocationSelection } from '@/components/shared/cascading-location-dropdown';
import { useToast } from '@/hooks/use-toast';
import { SELF_REGISTER_COORDINATOR_LEVELS, COORDINATOR_LEVEL_LABELS, CoordinatorLevel, REGION_ID } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function RegisterCoordinatorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [level, setLevel] = useState<CoordinatorLevel>('parish');
  const [location, setLocation] = useState<LocationSelection>({
    provinceId: null, zoneId: null, areaId: null, parishId: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const stopAtMap: Record<CoordinatorLevel, 'province' | 'zone' | 'area' | 'parish'> = {
    parish: 'parish',
    area: 'area',
    zone: 'zone',
    province: 'province',
    region: 'province',
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    const le: Record<string, string> = {};

    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (level !== 'region') {
      if (!location.provinceId) le.province = 'Please select a province';
      if (level === 'parish' || level === 'area' || level === 'zone') {
        if (!location.zoneId) le.zone = 'Please select a zone';
      }
      if (level === 'parish' || level === 'area') {
        if (!location.areaId) le.area = 'Please select an area';
      }
      if (level === 'parish') {
        if (!location.parishId) le.parish = 'Please select a parish';
      }
    }

    setErrors(e);
    setLocationErrors(le);
    return Object.keys(e).length === 0 && Object.keys(le).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setGeneralError(null);
    if (!validate()) return;

    setLoading(true);
    const lowerEmail = email.trim().toLowerCase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: lowerEmail,
      password,
      options: { data: { role: 'coordinator', full_name: fullName.trim() } },
    });

    if (authError) {
      setLoading(false);
      setGeneralError(authError.message.includes('already registered')
        ? 'An account with this email already exists. Please sign in.'
        : authError.message);
      return;
    }

    if (!authData.user) {
      setLoading(false);
      setGeneralError('Could not create account. Please try again.');
      return;
    }

    await supabase.from('user_profiles').insert({
      id: authData.user.id,
      role: 'coordinator',
      full_name: fullName.trim(),
      email: lowerEmail,
    });

    const coordinatorData: Record<string, unknown> = {
      user_id: authData.user.id,
      full_name: fullName.trim(),
      email: lowerEmail,
      phone: phone.trim() || null,
      level,
      is_approved: false,
    };

    if (level === 'parish') coordinatorData.parish_id = location.parishId;
    else if (level === 'area') coordinatorData.area_id = location.areaId;
    else if (level === 'zone') coordinatorData.zone_id = location.zoneId;
    else if (level === 'province') coordinatorData.province_id = location.provinceId;
    else if (level === 'region') coordinatorData.region_id = REGION_ID;

    const { error: coordError } = await supabase.from('coordinators').insert(coordinatorData);

    if (coordError) {
      setLoading(false);
      setGeneralError(`Error: ${coordError.message}`);
      return;
    }

    setLoading(false);
    toast({
      title: 'Registration received',
      description: 'Your coordinator account is pending approval by the Region Admin. You will be notified once approved.',
    });
    router.push('/signin');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-navy">Coordinator sign-up</CardTitle>
          <CardDescription>
            Register as a teacher or coordinator for your unit. You will select your exact position in the hierarchy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name <span className="text-crest">*</span></Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? 'border-crest' : ''}
                />
                {errors.fullName && <p className="text-xs text-crest">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-crest">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-crest' : ''}
                  />
                  {errors.email && <p className="text-xs text-crest">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-crest">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-crest' : ''}
                  />
                  {errors.password && <p className="text-xs text-crest">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password <span className="text-crest">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? 'border-crest' : ''}
                  />
                  {errors.confirmPassword && <p className="text-xs text-crest">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Level selection */}
            <div className="space-y-3">
              <Label>Your coordinator level <span className="text-crest">*</span></Label>
              <RadioGroup
                value={level}
                onValueChange={(v) => {
                  setLevel(v as CoordinatorLevel);
                  setLocation({ provinceId: null, zoneId: null, areaId: null, parishId: null });
                  setLocationErrors({});
                }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-5"
              >
                {SELF_REGISTER_COORDINATOR_LEVELS.map((lvl) => (
                  <div key={lvl} className="flex items-center gap-2">
                    <RadioGroupItem value={lvl} id={`level-${lvl}`} />
                    <Label htmlFor={`level-${lvl}`} className="text-sm cursor-pointer">
                      {COORDINATOR_LEVEL_LABELS[lvl]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {level !== 'region' && (
                <p className="text-xs text-muted-foreground">
                  Select the specific {COORDINATOR_LEVEL_LABELS[level].toLowerCase()} you coordinate.
                </p>
              )}
            </div>

            {/* Location dropdowns */}
            {level !== 'region' && (
              <div className="space-y-4">
                <CascadingLocationDropdown
                  value={location}
                  onChange={setLocation}
                  stopAt={stopAtMap[level]}
                  errors={locationErrors}
                />
              </div>
            )}

            <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="text-sm text-navy">
                Your account will be reviewed by the Region Admin before you can access the coordinator dashboard.
                This ensures only authorized teachers manage quiz questions and grading.
              </p>
            </div>

            <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign up as coordinator'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/signin" className="font-medium text-navy hover:text-gold-600">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
