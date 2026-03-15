import { cn } from "@/lib/utils";

interface Snippet {
  code: string;
  label: string;
  className: string;
}

const SNIPPETS: Snippet[] = [
  {
    code: "if mid == target:\n    return mid",
    label: "Binary search",
    className: "top-[15%] left-[6%] animate-float hidden md:block",
  },
  {
    code: "for neighbor in graph[v]:\n    dfs(neighbor)",
    label: "Graph DFS",
    className: "top-[30%] right-[5%] animate-float-2 hidden lg:block",
  },
  {
    code: "dp[i] = max(dp[i-1],\n         dp[i-2]+nums[i])",
    label: "Dynamic programming",
    className: "bottom-[25%] left-[3%] animate-float-3 hidden lg:block",
  },
];

interface FloatingCodeSnippetsProps {
  className?: string;
}

/**
 * Decorative floating code snippet pills for the landing page hero section.
 * Hidden on mobile (md:block) to avoid cluttering small screens.
 * aria-hidden so screen readers skip them entirely.
 */
export function FloatingCodeSnippets({ className }: FloatingCodeSnippetsProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)} aria-hidden="true">
      {SNIPPETS.map((snippet) => (
        <div
          key={snippet.label}
          className={cn(
            "absolute px-3 py-2 rounded-md border border-border/60 bg-card/80 backdrop-blur-sm shadow-md",
            snippet.className,
          )}
        >
          <pre className="font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre">
            {snippet.code}
          </pre>
        </div>
      ))}
    </div>
  );
}
