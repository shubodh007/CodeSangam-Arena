import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Trophy, Clock, Code2, Zap, ChevronDown } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const featuresReveal = useScrollReveal(0.15);

  const features = [
    {
      icon: Shield,
      title: "Proctored Environment",
      description: "Advanced anti-cheat system with focus detection and tab monitoring",
    },
    {
      icon: Trophy,
      title: "Real-time Leaderboard",
      description: "Live rankings with score, time, and attempt tracking",
    },
    {
      icon: Clock,
      title: "Timed Contests",
      description: "Server-authoritative timing for fair competition",
    },
    {
      icon: Code2,
      title: "Monaco Editor",
      description: "Professional code editor with syntax highlighting",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <AnimatedBackground />

      {/* Header */}
      <header className="border-b border-border header-glass sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex items-center justify-center py-20 min-h-[85vh] relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="animate-hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Zap size={14} className="animate-pulse" />
                High-Stakes Competitive Coding Platform
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-hero-title">
                <span className="text-foreground">Welcome to</span>
                <br />
                <span className="text-gradient-primary">CodeArena</span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-foreground-secondary max-w-2xl mx-auto animate-hero-subtitle">
                A professional proctored coding contest platform designed for fair, 
                focused, and distraction-free competitive programming.
              </p>

              {/* CTA Buttons */}
              <div className="animate-hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  variant="arena"
                  size="xl"
                  onClick={() => navigate("/student/entry")}
                  className="w-full sm:w-auto group"
                >
                  <Users size={20} className="transition-transform duration-200 group-hover:scale-110" />
                  Enter as Student
                </Button>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-indicator">
            <ChevronDown size={24} className="text-muted-foreground" />
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-background-secondary/30 relative">
          <div className="container mx-auto px-6">
            <div
              ref={featuresReveal.ref}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {features.map((feature, index) => (
                <ArenaCard
                  key={feature.title}
                  hover
                  className={`reveal-hidden ${featuresReveal.isVisible ? "reveal-visible" : ""} stagger-${index + 1}`}
                >
                  <ArenaCardContent className="space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                      <feature.icon size={24} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-foreground-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </ArenaCardContent>
                </ArenaCard>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 CodeArena. Built for fair and focused coding competitions.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
