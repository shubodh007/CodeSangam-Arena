import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface ArenaCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  style?: CSSProperties;
}

export function ArenaCard({
  children,
  className,
  hover = false,
  glow = false,
  style,
}: ArenaCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg transition-all duration-250",
        hover && "hover:bg-card-hover hover:border-border-active hover:-translate-y-1 hover:shadow-card-hover cursor-pointer",
        glow && "shadow-glow",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ArenaCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ArenaCardHeader({ children, className }: ArenaCardHeaderProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-border", className)}>
      {children}
    </div>
  );
}

interface ArenaCardContentProps {
  children: ReactNode;
  className?: string;
}

export function ArenaCardContent({ children, className }: ArenaCardContentProps) {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  );
}

interface ArenaCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function ArenaCardFooter({ children, className }: ArenaCardFooterProps) {
  return (
    <div className={cn("px-6 py-4 border-t border-border bg-background-secondary/50", className)}>
      {children}
    </div>
  );
}
