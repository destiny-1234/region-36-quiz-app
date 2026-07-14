import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Terms of use | Region 36 Quiz Challenge' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-navy">Terms of use</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6 text-ink">
          <section>
            <h2 className="font-serif text-xl text-navy">Acceptable use</h2>
            <p className="mt-2 text-muted-foreground">
              This platform is provided by RCCG Region 36 Children&apos;s Ministry for the purpose of running the annual
              quiz competition. By creating an account, you agree to use the platform only for its intended purpose.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Fair play</h2>
            <p className="mt-2 text-muted-foreground">
              Children must attempt quizzes independently without assistance from parents, siblings, or other children.
              Coordinators are responsible for ensuring the integrity of the quiz environment. Tab-switching and
              window-minimizing during a quiz are tracked and reported to coordinators.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Question ownership</h2>
            <p className="mt-2 text-muted-foreground">
              Quiz questions are created by coordinators and are for competition use only. Questions must not be shared
              outside the platform before or during a competition stage.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Account responsibility</h2>
            <p className="mt-2 text-muted-foreground">
              You are responsible for keeping your password secure. Do not share your login credentials with others.
              Parents are responsible for their child&apos;s account until the child is old enough to manage it independently.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Results and qualification</h2>
            <p className="mt-2 text-muted-foreground">
              Results are finalized once all fill-in-the-blank answers are graded and the coordinator publishes results.
              Qualification decisions are made by coordinators and may be overridden by the Region Admin. Tie-breakers
              are resolved automatically by shortest time taken.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-navy">Changes to terms</h2>
            <p className="mt-2 text-muted-foreground">
              These terms may be updated at any time. Continued use of the platform after changes constitutes acceptance
              of the updated terms.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
