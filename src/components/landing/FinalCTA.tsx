import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_SIGNALS = [
  "Free for students",
  "No credit card required",
  "Setup in 2 minutes",
];

export function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-background-secondary/30">
      {/* Grid pattern backdrop */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-success/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Ready to Run Your{" "}
            <span className="text-gradient-primary">First Contest?</span>
          </h2>

          {/* Sub-headline */}
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Join thousands of students and institutions using CodeSangam Arena to make competitive
            programming accessible, fair, and fun.
          </p>

          {/* CTA */}
          <div className="flex justify-center">
            <Button variant="arena" size="xl" asChild className="group">
              <Link to="/student/entry">
                Join a Contest Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-6 pt-2 text-sm text-muted-foreground">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
