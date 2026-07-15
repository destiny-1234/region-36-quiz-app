import Link from 'next/link';
import { CountdownBanner } from '@/components/home/countdown-banner';
import { StageJourney } from '@/components/layout/stage-journey';
import { RegionalCoordinatorPhoto, Region36Logo } from '@/components/layout/region-36-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Eye, Trophy, BookOpen, ShieldCheck } from 'lucide-react';

const ageCategories = [
  { range: '0–5', label: 'Preschool' },
  { range: '6–8', label: 'Early primary' },
  { range: '9–12', label: 'Late primary' },
  { range: '13–15', label: 'Junior secondary' },
  { range: '16–19', label: 'Senior secondary' },
];

export default function HomePage() {
  return (
    <>
      <CountdownBanner />

      {/* Hero */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-500 px-4 py-1.5">
                <Region36Logo size={24} />
                <span className="text-xs font-medium text-gold">RCCG Children&apos;s Ministry</span>
              </div>
              <h1 className="font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl lg:text-6xl">
                Region 36<br />
                <span className="text-gold">Quiz Challenge</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-cream/80">
                A five-stage bible quiz competition for children across RCCG Region 36.
                From parish to regional level, young hearts grow in the knowledge of God&apos;s word.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold-600">
                  <Link href="/register/child">Register a child</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-gold/40 bg-transparent text-cream hover:bg-navy-500 hover:text-gold">
                  <Link href="/register/coordinator">Coordinator sign-up</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-cream/20 bg-transparent text-cream hover:bg-navy-500">
                  <Link href="/signin">Parent login</Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-lg border border-gold/20 bg-navy-500 p-8">
                <h2 className="font-serif text-xl font-semibold text-gold">The journey</h2>
                <p className="mt-2 text-sm text-cream/70">
                  Every child progresses through five stages, from their local parish to the regional final.
                </p>
                <div className="mt-6">
                  <StageJourney variant="horizontal" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stage journey — full vertical */}
      <section className="bg-cream py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-navy sm:text-4xl">The stage journey</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From your local parish to the regional final, each stage is a step forward in faith and knowledge.
              Qualifiers at each level advance to compete at the next.
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <StageJourney variant="vertical" />
          </div>
        </div>
      </section>

      {/* Coordinator welcome */}
      <section className="bg-cream-dark py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-3">
            <div className="lg:col-span-1">
              {/* REGIONAL_COORDINATOR_PHOTO placeholder */}
              <RegionalCoordinatorPhoto className="aspect-square w-full max-w-xs" />
            </div>
            <div className="lg:col-span-2">
              <h2 className="font-serif text-3xl font-bold text-navy">A word from our Regional Coordinator</h2>
              <blockquote className="mt-6 text-lg leading-relaxed text-ink">
                &ldquo;Welcome to the Region 36 Quiz Challenge. This competition is more than questions and answers —
                it is an opportunity for our children to hide God&apos;s word in their hearts. We invite every parish,
                area, zone, and province to participate, and we pray that every child who takes part grows stronger
                in faith and deeper in the knowledge of our Lord Jesus Christ.&rdquo;
              </blockquote>
              <p className="mt-4 font-serif text-lg font-semibold text-navy">
                Regional Coordinator
              </p>
              <p className="text-sm text-muted-foreground">RCCG Region 36 Children&apos;s Ministry</p>
            </div>
          </div>
        </div>
      </section>

      {/* Age categories */}
      <section className="bg-cream py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-navy">Five age categories</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Questions are tailored to each age group, ensuring fairness and age-appropriate challenge across the competition.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ageCategories.map((cat) => (
              <Card key={cat.range} className="border-navy/10 bg-cream-light text-center">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl text-gold-600">{cat.range}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User type CTAs */}
      <section className="bg-navy py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-cream">Get started</h2>
            <p className="mx-auto mt-4 max-w-2xl text-cream/70">
              Choose your role to access the right tools for you.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="border-gold/20 bg-navy-500">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
                  <Users className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="font-serif text-xl text-cream">For children</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-cream/70">
                  Sign up to take the quiz for your stage and age category. Practice mode is available anytime.
                </p>
                <Button asChild className="mt-4 w-full bg-gold text-navy hover:bg-gold-600">
                  <Link href="/register/child">Register a child</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-navy-500">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
                  <GraduationCap className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="font-serif text-xl text-cream">For coordinators</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-cream/70">
                  Set questions, register children, grade answers, and manage your unit&apos;s competition stage.
                </p>
                <Button asChild className="mt-4 w-full border-gold/40 bg-transparent text-gold hover:bg-navy-400">
                  <Link href="/register/coordinator">Coordinator sign-up</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-navy-500">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
                  <Eye className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="font-serif text-xl text-cream">For parents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-cream/70">
                  Log in with your email to view your child&apos;s progress, results, and certificates.
                </p>
                <Button asChild className="mt-4 w-full border-cream/20 bg-transparent text-cream hover:bg-navy-400">
                  <Link href="/signin">Parent login</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
                <ShieldCheck className="h-6 w-6 text-navy" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-navy">Secure and private</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Parental consent required. Minimal data collection. Your child&apos;s information stays protected.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
                <BookOpen className="h-6 w-6 text-navy" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-navy">Fair questions</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Each child receives a randomized subset of questions from the bank, reducing answer-sharing.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
                <Trophy className="h-6 w-6 text-navy" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-navy">Certificates</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every child who completes a stage receives a downloadable certificate, with special certificates for qualifiers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
