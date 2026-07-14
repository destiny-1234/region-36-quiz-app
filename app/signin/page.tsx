'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setLoading(false);
      if (signInError.message.includes('Invalid login')) {
        setError('Incorrect email or password. Please try again.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      toast({ title: 'Welcome back', description: 'You have signed in successfully.' });

      if (redirectTo) {
        router.push(redirectTo);
      } else if (profile?.role === 'region_admin') {
        router.push('/admin');
      } else if (profile?.role === 'coordinator') {
        router.push('/coordinator');
      } else if (profile?.role === 'child') {
        router.push('/child');
      } else if (profile?.role === 'parent') {
        router.push('/parent');
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Card className="w-full border-navy/10 bg-cream-light">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl text-navy">Sign in</CardTitle>
          <CardDescription>Access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-muted-foreground">
              Forgot your password?{' '}
              <Link href="/forgot-password" className="font-medium text-gold-600 hover:text-gold-700">
                Reset it here
              </Link>
            </p>
            <div className="pt-4 border-t border-navy/10">
              <p className="text-muted-foreground">Need an account?</p>
              <div className="mt-2 flex flex-col gap-1">
                <Link href="/register/child" className="font-medium text-navy hover:text-gold-600">
                  Register a child
                </Link>
                <Link href="/register/coordinator" className="font-medium text-navy hover:text-gold-600">
                  Coordinator sign-up
                </Link>
                <Link href="/register/parent" className="font-medium text-navy hover:text-gold-600">
                  Parent sign-up
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
