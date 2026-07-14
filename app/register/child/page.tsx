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
import { CascadingLocationDropdown, LocationSelection } from '@/components/shared/cascading-location-dropdown';
import { useToast } from '@/hooks/use-toast';
import { computeAgeCategory, AGE_CATEGORY_LABELS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function RegisterChildPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [location, setLocation] = useState<LocationSelection>({
    provinceId: null, zoneId: null, areaId: null, parishId: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const computedCategory = dob ? computeAgeCategory(dob) : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const le: Record<string, string> = {};

    if (!fullName.trim()) e.fullName = 'Child&apos;s full name is required';
    if (!dob) e.dob = 'Date of birth is required';
    else {
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (age < 0 || age > 19) e.dob = 'Age must be between 0 and 19 years';
    }
    if (!parentName.trim()) e.parentName = 'Parent or guardian name is required';
    if (!parentEmail.trim()) e.parentEmail = 'Parent email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) e.parentEmail = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!consent) e.consent = 'You must confirm consent to register your child';

    if (!location.provinceId) le.province = 'Please select a province';
    if (!location.zoneId) le.zone = 'Please select a zone';
    if (!location.areaId) le.area = 'Please select an area';
    if (!location.parishId) le.parish = 'Please select a parish';

    setErrors(e);
    setLocationErrors(le);
    return Object.keys(e).length === 0 && Object.keys(le).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setGeneralError(null);

    if (!validate()) return;

    setLoading(true);

    const email = parentEmail.trim().toLowerCase();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'child', full_name: fullName.trim() },
      },
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes('already registered')) {
        setGeneralError('An account with this email already exists. Please sign in instead.');
      } else {
        setGeneralError(authError.message);
      }
      return;
    }

    if (!authData.user) {
      setLoading(false);
      setGeneralError('Could not create account. Please try again.');
      return;
    }

    // Fetch hierarchy IDs for the selected parish
    const { data: parish } = await supabase
      .from('parishes')
      .select('id, area_id, zones!inner(id, province_id)')
      .eq('id', location.parishId!)
      .maybeSingle();

    // Simpler: fetch area -> zone -> province
    const { data: area } = await supabase
      .from('areas')
      .select('id, zone_id')
      .eq('id', location.areaId!)
      .maybeSingle();
    const { data: zone } = await supabase
      .from('zones')
      .select('id, province_id')
      .eq('id', location.zoneId!)
      .maybeSingle();

    const regNum = `R36-${Date.now().toString().slice(-5)}`;

    // Create profile
    await supabase.from('user_profiles').insert({
      id: authData.user.id,
      role: 'child',
      full_name: fullName.trim(),
      email,
    });

    // Create child record
    const { error: childError } = await supabase.from('children').insert({
      user_id: authData.user.id,
      full_name: fullName.trim(),
      date_of_birth: dob,
      age_category: computedCategory,
      parish_id: location.parishId,
      area_id: location.areaId,
      zone_id: location.zoneId,
      province_id: location.provinceId,
      region_id: 'a0000000-0000-0000-0000-000000000036',
      parent_name: parentName.trim(),
      parent_email: email,
      parent_phone: parentPhone.trim() || null,
      consent_given: true,
      consent_at: new Date().toISOString(),
      registration_number: regNum,
    });

    if (childError) {
      setLoading(false);
      setGeneralError(`Registration error: ${childError.message}`);
      return;
    }

    setLoading(false);
    toast({
      title: 'Registration successful',
      description: `${fullName} has been registered in the ${computedCategory ? AGE_CATEGORY_LABELS[computedCategory] : ''} category.`,
    });
    router.push('/signin');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-navy">Register a child</CardTitle>
          <CardDescription>
            Enter your child&apos;s details below. You will create an account using the parent email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            {/* Child details */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-navy">Child details</h3>

              <div className="space-y-2">
                <Label htmlFor="fullName">Child&apos;s full name <span className="text-crest">*</span></Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First and last name"
                  className={errors.fullName ? 'border-crest' : ''}
                />
                {errors.fullName && <p className="text-xs text-crest">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth <span className="text-crest">*</span></Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.dob ? 'border-crest' : ''}
                />
                {errors.dob && <p className="text-xs text-crest">{errors.dob}</p>}
                {computedCategory && (
                  <p className="text-xs text-muted-foreground">
                    Age category: <span className="font-medium text-navy">{AGE_CATEGORY_LABELS[computedCategory]}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-navy">Location</h3>
              <p className="text-sm text-muted-foreground">
                Select your child&apos;s parish from the dropdowns below.
              </p>
              <CascadingLocationDropdown
                value={location}
                onChange={setLocation}
                errors={locationErrors}
              />
            </div>

            {/* Parent details */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-navy">Parent / guardian</h3>

              <div className="space-y-2">
                <Label htmlFor="parentName">Parent or guardian name <span className="text-crest">*</span></Label>
                <Input
                  id="parentName"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Full name"
                  className={errors.parentName ? 'border-crest' : ''}
                />
                {errors.parentName && <p className="text-xs text-crest">{errors.parentName}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Parent email <span className="text-crest">*</span></Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={errors.parentEmail ? 'border-crest' : ''}
                  />
                  {errors.parentEmail && <p className="text-xs text-crest">{errors.parentEmail}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhone">Parent phone (optional)</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-navy">Account password</h3>

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

            {/* Consent */}
            <div className="space-y-3 rounded-lg border border-navy/10 bg-cream p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="consent" className="text-sm font-medium cursor-pointer">
                    I confirm I am the parent or guardian of this child and I give consent for their participation
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    I understand that my child&apos;s name, age category, and quiz results will be visible to their
                    coordinators and the regional admin. I have read the{' '}
                    <Link href="/privacy" className="text-gold-600 hover:text-gold-700">privacy policy</Link>.
                  </p>
                </div>
              </div>
              {errors.consent && <p className="text-xs text-crest">{errors.consent}</p>}
            </div>

            <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register child'}
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
