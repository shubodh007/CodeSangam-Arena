import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { FloatingCodeSnippets } from "@/components/landing/FloatingCodeSnippets";
import { StatsSection } from "@/components/landing/StatsSection";
import { LiveActivityTicker } from "@/components/landing/LiveActivityTicker";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Zap,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Nav links ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "FAQ", href: "#faq" },
];

const TRUST_SIGNALS = [
  "100% Browser-Based",
  "No Installation Required",
  "99.9% Uptime",
];

// ── Index Page ────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <AnimatedBackground />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-border header-glass sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <Logo size="md" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Header CTA */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/entry")}>
              <Users className="h-4 w-4 mr-1.5" />
              Student Entry
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-auto text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm px-6 pb-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-foreground-secondary hover:text-primary transition-colors py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate("/student/entry")}>
                Student Entry
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 flex flex-col">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          className="flex-1 flex items-center justify-center py-24 min-h-[88vh] relative"
          aria-labelledby="hero-heading"
        >
          <FloatingCodeSnippets />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="animate-hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Zap size={14} className="animate-pulse" />
                Trusted by 150+ Institutions
              </div>

              {/* Heading */}
              <h1
                id="hero-heading"
                className="text-5xl md:text-7xl font-bold tracking-tight animate-hero-title"
              >
                <span className="text-foreground">Run Secure Coding</span>
                <br />
                <span className="text-gradient-primary">Contests Like the Pros</span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-foreground-secondary max-w-2xl mx-auto animate-hero-subtitle leading-relaxed">
                Professional proctored programming contests with real-time leaderboards,
                anti-cheat monitoring, and enterprise-grade code execution.{" "}
                <strong className="text-primary">No setup. No downloads. Just code.</strong>
              </p>

              {/* CTA */}
              <div className="animate-hero-cta flex items-center justify-center pt-2">
                <Button
                  variant="arena"
                  size="xl"
                  onClick={() => navigate("/student/entry")}
                  className="w-full sm:w-auto group"
                >
                  <Users size={18} className="transition-transform duration-200 group-hover:scale-110" />
                  Join a Contest
                  <ArrowRight size={16} className="ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </div>

              {/* Trust signals */}
              <div
                className={cn(
                  "animate-hero-cta flex flex-wrap items-center justify-center gap-x-6 gap-y-2",
                  "text-sm text-muted-foreground",
                )}
              >
                {TRUST_SIGNALS.map((signal) => (
                  <div key={signal} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-indicator">
            <ChevronDown size={24} className="text-muted-foreground" />
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <StatsSection />

        {/* ── Live Activity ─────────────────────────────────────────────── */}
        <LiveActivityTicker />

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <HowItWorks />

        {/* ── Features ──────────────────────────────────────────────────── */}
        <FeaturesSection />

        {/* ── Use Cases ─────────────────────────────────────────────────── */}
        <UseCasesSection />

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <FAQSection />

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <FinalCTA />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </div>
  );
};

export default Index;
