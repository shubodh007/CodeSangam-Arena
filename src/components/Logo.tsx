import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: "text-lg" },
    md: { icon: 28, text: "text-2xl" },
    lg: { icon: 40, text: "text-4xl" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
        <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-lg">
          <Code2 size={sizes[size].icon} className="text-primary-foreground" />
        </div>
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", sizes[size].text)}>
          <span className="text-foreground">Code</span>
          <span className="text-primary">Arena</span>
        </span>
      )}
    </div>
  );
}
