import { StageJourney } from '@/components/layout/stage-journey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'About | Region 36 Quiz Challenge' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-navy">About the competition</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          The Region 36 Quiz Challenge is an annual bible quiz competition for children across RCCG Region 36.
          It is designed to encourage young people to study and memorize God&apos;s word in a structured, fair, and
          encouraging environment.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-navy/10 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-navy">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Each child is assigned to an age category based on their date of birth. There are five categories: 0–5, 6–8, 9–12, 13–15, and 16–19 years.</p>
            <p>Coordinators at each level create quiz questions for their unit. Questions include multiple choice, true/false, and fill-in-the-blank formats.</p>
            <p>Children take the quiz online with a timer. Each child receives a randomized subset of questions from the bank to ensure fairness.</p>
            <p>Results are graded — multiple choice and true/false are auto-graded, while fill-in-the-blank answers are reviewed manually by coordinators.</p>
            <p>Qualifiers at each stage advance to the next level, progressing from parish all the way to the regional final.</p>
          </CardContent>
        </Card>

        <Card className="border-navy/10 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-navy">Accessibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>The platform includes a larger-text mode for younger children in the 0–5 and 6–8 age categories, making questions easier to read.</p>
            <p>Practice mode is available for every age category, allowing children to familiarize themselves with the quiz format before the real competition.</p>
            <p>The interface is fully keyboard-navigable with visible focus states throughout.</p>
            <p>We respect reduced-motion preferences for users who prefer minimal animations.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16">
        <h2 className="text-center font-serif text-3xl font-bold text-navy">The five stages</h2>
        <div className="mt-12 flex justify-center">
          <StageJourney variant="vertical" />
        </div>
      </div>
    </div>
  );
}
