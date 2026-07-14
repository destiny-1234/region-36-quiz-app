import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Privacy policy | Region 36 Quiz Challenge' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-navy">Privacy policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6 text-ink">
          <section>
            <h2 className="font-serif text-xl text-navy">What we collect</h2>
            <p className="mt-2 text-muted-foreground">
              When you register a child, we collect: the child&apos;s full name, date of birth, and the parish they belong to.
              For parents and guardians, we collect your name, email address, and an optional phone number.
              For coordinators, we collect your name, email, phone, and the unit you coordinate.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Why we collect it</h2>
            <p className="mt-2 text-muted-foreground">
              This information is used solely to run the quiz competition. We use your child&apos;s date of birth to
              assign them to the correct age category. We use your email to send you notifications about your child&apos;s
              progress, results, and when new stages open. Coordinators use the information to manage their unit&apos;s
              participants and grading.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Who can see it</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Your child&apos;s direct coordinator (parish, area, zone, or province teacher) can see their name, age category, and results.</li>
              <li>The Region Admin can see all participant data for oversight and management.</li>
              <li>Other children and parents cannot see your child&apos;s data. Leaderboards show only first name and last initial for published results.</li>
              <li>We do not sell, share, or transfer your data to any third party.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Parental consent</h2>
            <p className="mt-2 text-muted-foreground">
              No child data is stored without explicit consent from a parent or guardian. Consent is confirmed at
              registration and recorded with a timestamp. You may withdraw consent at any time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Data deletion</h2>
            <p className="mt-2 text-muted-foreground">
              If you wish to have your child&apos;s data removed from the platform, contact your regional coordinator or
              the Region Admin. We will delete all personally identifiable data within 30 days, while retaining
              anonymized aggregate statistics for historical reporting.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Data security</h2>
            <p className="mt-2 text-muted-foreground">
              All data is stored in a secure, encrypted database with row-level security policies. Passwords are hashed
              and never stored in plain text. Access to data is restricted by role and unit.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              For any privacy questions or requests, contact the RCCG Region 36 Children&apos;s Ministry coordinator.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
