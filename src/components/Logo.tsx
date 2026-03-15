import { useState } from "react";
import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: 28,  icon: 16, text: "text-lg"  },
  md: { img: 38,  icon: 22, text: "text-2xl" },
  lg: { img: 56,  icon: 34, text: "text-4xl" },
};

/**
 * CodeSangam Arena — brand logo.
 *
 * Loads the logo image from /logo.png.  If the image fails to load (e.g. file
 * not yet placed in /public) the component falls back to the Code2 icon so the
 * UI is never blank.
 */
export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      {/* Icon / image */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full transition-all duration-300 group-hover:bg-primary/30 group-hover:blur-xl" />
        {!imgError ? (
          <img
            src="/logo.png"
            alt="CodeSangam Arena"
            width={s.img}
            height={s.img}
            className="relative drop-shadow-lg rounded-md transition-transform duration-200 group-hover:scale-105 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-lg transition-transform duration-200 group-hover:scale-105">
            <Code2 size={s.icon} className="text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Brand name — Rubik font */}
      {showText && (
        <span
          className={cn("font-display font-bold tracking-tight leading-none", s.text)}
        >
          <span className="text-foreground">Code</span>
          <span className="text-primary">Sangam</span>
          <span className="text-foreground/70"> Arena</span>
        </span>
      )}
    </div>
  );
}
