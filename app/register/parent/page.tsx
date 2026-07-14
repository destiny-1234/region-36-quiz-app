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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function RegisterParentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Your name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!childEmail.trim()) e.childEmail = 'Your child&apos;s registration email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(childEmail)) e.childEmail = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setGeneralError(null);
    if (!validate()) return;

    setLoading(true);
    const lowerEmail = email.trim().toLowerCase();
    const lowerChildEmail = childEmail.trim().toLowerCase();

    // First check if a child exists with this email
    const { data: children } = await supabase
      .from('children')
      .select('id, full_name')
      .eq('parent_email', lowerChildEmail)
      .maybeSingle();

    if (!children) {
      setLoading(false);
      setGeneralError('No child found with that registration email. Please check the email and try again, or register your child first.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: lowerEmail,
      password,
      options: { data: { role: 'parent', full_name: fullName.trim() } },
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
      role: 'parent',
      full_name: fullName.trim(),
      email: lowerEmail,
    });

    const { data: parentRecord } = await supabase
      .from('parents')
      .insert({
        user_id: authData.user.id,
        full_name: fullName.trim(),
        email: lowerEmail,
        phone: phone.trim() || null,
      })
      .select('id')
      .single();

    if (parentRecord) {
      await supabase.from('parent_children').insert({
        parent_id: parentRecord.id,
        child_id: children.id,
      });
    }

    setLoading(false);
    toast({
      title: 'Account created',
      description: `You are now linked to ${children.full_name}. You can view their progress after signing in.`,
    });
    router.push('/signin');
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-navy">Parent sign-up</CardTitle>
          <CardDescription>
            Create a read-only account to view your child&apos;s quiz progress and results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Your full name <span className="text-crest">*</span></Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={errors.fullName ? 'border-crest' : ''} />
              {errors.fullName && <p className="text-xs text-crest">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Your email <span className="text-crest">*</span></Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? 'border-crest' : ''} />
              {errors.email && <p className="text-xs text-crest">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="childEmail">Email used to register your child <span className="text-crest">*</span></Label>
              <Input id="childEmail" type="email" value={childEmail} onChange={(e) => setChildEmail(e.target.value)}
                placeholder="The email you used when registering your child"
                className={errors.childEmail ? 'border-crest' : ''} />
              {errors.childEmail && <p className="text-xs text-crest">{errors.childEmail}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-crest">*</span></Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'border-crest' : ''} />
                {errors.password && <p className="text-xs text-crest">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm <span className="text-crest">*</span></Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? 'border-crest' : ''} />
                {errors.confirmPassword && <p className="text-xs text-crest">{errors.confirmPassword}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create parent account'}
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
