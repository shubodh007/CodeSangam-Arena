import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Shield, Cpu, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────────────────────────

interface FAQ {
  q: string;
  a: string;
}

interface FAQCategory {
  category: string;
  icon: typeof Users;
  faqs: FAQ[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    category: "For Students",
    icon: Users,
    faqs: [
      {
        q: "Do I need to create an account?",
        a: "No! Just enter your name when you join a contest. Your instructor shares a unique link, and you're in—no password, no email verification, no signup.",
      },
      {
        q: "What happens if I accidentally close my browser?",
        a: "Your code is auto-saved every 30 seconds to your browser storage. Simply reopen the contest link and pick up where you left off—your timer continues from where it paused.",
      },
      {
        q: "Can I use my own code editor (VS Code, PyCharm)?",
        a: "CodeSangam Arena uses Monaco Editor—the exact engine powering VS Code—with syntax highlighting, auto-indentation, bracket matching, and all keyboard shortcuts. You'll feel right at home.",
      },
      {
        q: "What if I get flagged for cheating by mistake?",
        a: "You'll receive warnings before any disqualification. If you believe it's a false positive, contact your instructor—they can review detailed violation logs and reinstate you.",
      },
      {
        q: "Which programming languages are supported?",
        a: "Python, Java, C, C++, and Go are supported today. More languages are coming soon based on user feedback and demand.",
      },
    ],
  },
  {
    category: "For Admins",
    icon: Shield,
    faqs: [
      {
        q: "How long does it take to create a contest?",
        a: "About 2 minutes. Add a title, upload problems (or write them in our Markdown editor), set the duration, and click Create. Share the generated link with your students.",
      },
      {
        q: "Can I see student code during the contest?",
        a: "Yes. The admin dashboard shows live submissions in real-time. You can view code, test-case results, and execution logs for any student at any point during the contest.",
      },
      {
        q: "How do I prevent students from sharing contest links?",
        a: "Each session is tied to a unique username. If two students submit from the same session, you'll see duplicate session warnings on your dashboard and can investigate.",
      },
      {
        q: "Can I reuse problems from previous contests?",
        a: "Absolutely. All problems you create are saved to your problem library. Clone an entire contest with one click, or mix and match problems from past contests.",
      },
      {
        q: "What if 100 students submit at the same time?",
        a: "Our infrastructure is built to handle it. We've tested with 500+ concurrent submissions without degradation. Submissions queue and are processed in under 3 seconds on average.",
      },
    ],
  },
  {
    category: "Technical",
    icon: Cpu,
    faqs: [
      {
        q: "How is code executed securely?",
        a: "Every submission runs in an isolated Docker container with strict time (2 s) and memory (256 MB) limits. Containers are destroyed immediately after execution—no code or data persists.",
      },
      {
        q: "What happens if my internet disconnects mid-contest?",
        a: "Your code is saved locally in your browser. When you reconnect, it automatically syncs back to our servers. Your timer pauses during the disconnection window.",
      },
      {
        q: "Is student code stored after the contest ends?",
        a: "Yes, for 90 days. Admins can download all submissions as a ZIP archive. After 90 days, code is permanently deleted to protect student privacy.",
      },
      {
        q: "Can students copy-paste code from external sources?",
        a: "Clipboard monitoring detects large paste events. While we don't block paste (for accessibility reasons), admins receive real-time alerts whenever a student pastes a large code block.",
      },
    ],
  },
];

// ── Category Block ────────────────────────────────────────────────────────────

interface CategoryBlockProps extends FAQCategory {
  isVisible: boolean;
  delay: number;
}

function CategoryBlock({ category, icon: Icon, faqs, isVisible, delay }: CategoryBlockProps) {
  return (
    <div
      className={cn("space-y-3 reveal-hidden", isVisible && "reveal-visible")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon className="h-5 w-5 text-primary" />
        {category}
      </h3>
      <Accordion type="single" collapsible className="space-y-1.5">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`${category}-${i}`}
            className="border border-border/60 rounded-lg px-4 bg-background-secondary/20 hover:bg-background-secondary/40 transition-colors"
          >
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-3.5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground-secondary pb-4 leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FAQSection() {
  const { ref, isVisible } = useScrollReveal(0.08);

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 text-primary border-primary/30 bg-primary/5">
            FAQ
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-foreground-secondary">
            Everything you need to know about CodeSangam Arena
          </p>
        </div>

        {/* FAQ categories */}
        <div ref={ref} className="space-y-10">
          {FAQ_DATA.map((cat, i) => (
            <CategoryBlock
              key={cat.category}
              {...cat}
              isVisible={isVisible}
              delay={i * 120}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Still have questions?</p>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:support@codearena.pro" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
