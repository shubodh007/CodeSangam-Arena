import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyCombo, KeyboardKey, parseKeysForDisplay } from "@/components/ui/keyboard-key";
import { useKeyboardStore } from "@/store/keyboardStore";
import {
  Code2,
  Navigation,
  Trophy,
  Zap,
  Search,
  Sparkles,
  Command,
  Play,
  Send,
  Save,
  RotateCcw,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shortcut data ────────────────────────────────────────────────────────────

type Category = "code" | "navigation" | "contest" | "general";

interface ShortcutDef {
  id: string;
  key: string;
  description: string;
  category: Category;
  icon: React.ReactNode;
}

const SHORTCUTS: ShortcutDef[] = [
  // Code
  { id: "run",     key: "Ctrl+R",     description: "Run code against sample tests", category: "code",       icon: <Play      className="h-3.5 w-3.5" /> },
  { id: "submit",  key: "Ctrl+Enter", description: "Submit solution",                category: "code",       icon: <Send      className="h-3.5 w-3.5" /> },
  { id: "save",    key: "Ctrl+S",     description: "Save code locally",              category: "code",       icon: <Save      className="h-3.5 w-3.5" /> },
  { id: "format",  key: "Ctrl+K",     description: "Format / lint code",             category: "code",       icon: <Code2     className="h-3.5 w-3.5" /> },
  { id: "comment", key: "Ctrl+/",     description: "Toggle line comment",            category: "code",       icon: <Code2     className="h-3.5 w-3.5" /> },
  { id: "undo",    key: "Ctrl+Z",     description: "Undo last change",               category: "code",       icon: <RotateCcw className="h-3.5 w-3.5" /> },
  { id: "redo",    key: "Ctrl+Y",     description: "Redo",                           category: "code",       icon: <RotateCcw className="h-3.5 w-3.5 scale-x-[-1]" /> },
  // Navigation
  { id: "prob1",   key: "Alt+1",      description: "Go to Problem 1",                category: "navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "prob2",   key: "Alt+2",      description: "Go to Problem 2",                category: "navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "prob3",   key: "Alt+3",      description: "Go to Problem 3",                category: "navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "prob4",   key: "Alt+4",      description: "Go to Problem 4",                category: "navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "lb",      key: "Ctrl+L",     description: "View leaderboard",               category: "navigation", icon: <Trophy     className="h-3.5 w-3.5" /> },
  { id: "back",    key: "Ctrl+P",     description: "Back to problem list",           category: "navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  // Contest
  { id: "fs",      key: "F11",        description: "Toggle fullscreen mode",         category: "contest",    icon: <Zap        className="h-3.5 w-3.5" /> },
  // General
  { id: "help",    key: "?",          description: "Show this shortcuts guide",      category: "general",    icon: <Command    className="h-3.5 w-3.5" /> },
  { id: "esc",     key: "Esc",        description: "Close modals / overlays",        category: "general",    icon: <Keyboard   className="h-3.5 w-3.5" /> },
];

// ── Category tabs config ────────────────────────────────────────────────────

type TabId = "all" | Category;

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "all",        label: "All",        icon: <Command    className="h-3.5 w-3.5" /> },
  { id: "code",       label: "Code",       icon: <Code2      className="h-3.5 w-3.5" /> },
  { id: "navigation", label: "Navigation", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "contest",    label: "Contest",    icon: <Trophy     className="h-3.5 w-3.5" /> },
  { id: "general",    label: "General",    icon: <Sparkles   className="h-3.5 w-3.5" /> },
];

// ── Category accent colours ─────────────────────────────────────────────────

const categoryAccent: Record<Category, string> = {
  code:       "text-[hsl(var(--primary))]       bg-[hsl(var(--primary)/0.1)]",
  navigation: "text-[hsl(var(--accent))]        bg-[hsl(var(--accent)/0.1)]",
  contest:    "text-[hsl(var(--warning))]       bg-[hsl(var(--warning)/0.1)]",
  general:    "text-[hsl(var(--success))]       bg-[hsl(var(--success)/0.1)]",
};

const categoryBorder: Record<Category, string> = {
  code:       "border-l-[hsl(var(--primary)/0.6)]",
  navigation: "border-l-[hsl(var(--accent)/0.6)]",
  contest:    "border-l-[hsl(var(--warning)/0.6)]",
  general:    "border-l-[hsl(var(--success)/0.6)]",
};

// ── Main component ───────────────────────────────────────────────────────────

export function KeyboardShortcutsModal() {
  const { isModalOpen, setModalOpen, lastPressedKeys } = useKeyboardStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SHORTCUTS.filter((s) => {
      const matchesSearch =
        !q || s.description.toLowerCase().includes(q) || s.key.toLowerCase().includes(q);
      const matchesTab = activeTab === "all" || s.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [search, activeTab]);

  const handleClose = useCallback(() => setModalOpen(false), [setModalOpen]);

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent
        aria-describedby="kbd-modal-desc"
        className={cn(
          // Override default bg/border — use glassmorphism
          "max-w-2xl p-0 overflow-hidden gap-0",
          "rounded-2xl",
        )}
        style={{
          background: "rgba(8, 8, 18, 0.88)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(139, 92, 246, 0.22)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), " +
            "0 0 40px rgba(139, 92, 246, 0.18), " +
            "0 0 80px rgba(139, 92, 246, 0.08), " +
            "0 25px 60px rgba(0, 0, 0, 0.65)",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <DialogHeader className="p-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center animate-pulse-glow"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)/0.25) 0%, hsl(var(--accent)/0.15) 100%)",
                  border: "1px solid hsl(var(--primary)/0.4)",
                  boxShadow: "0 0 16px hsl(var(--primary-glow)/0.35)",
                }}
              >
                <Command className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription id="kbd-modal-desc" className="text-xs text-white/40 mt-0.5">
                  Boost your speed during contests
                </DialogDescription>
              </div>
            </div>

            {/* Recent keys */}
            {lastPressedKeys.length > 0 && (
              <div className="flex items-center gap-1.5 flex-shrink-0 hidden sm:flex">
                <span className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Recent</span>
                <div className="flex gap-1">
                  {lastPressedKeys.slice(0, 3).map((key, i) => (
                    <KeyboardKey
                      key={`${key}-${i}`}
                      className={cn(
                        "min-w-0 h-6 px-1.5 text-[10px]",
                        i > 0 && "opacity-50"
                      )}
                    >
                      {key}
                    </KeyboardKey>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mt-3 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-[hsl(var(--primary))] transition-colors duration-200 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search shortcuts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "pl-9 h-9 text-sm rounded-lg",
                "bg-white/[0.04] border-white/[0.08]",
                "text-white placeholder:text-white/25",
                "focus:border-[hsl(var(--primary)/0.5)] focus:bg-white/[0.06]",
                "focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary)/0.35)]",
                "transition-all duration-200",
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </DialogHeader>

        {/* ── Category tabs ─────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id
                    ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.35)] shadow-[0_0_12px_hsl(var(--primary-glow)/0.2)]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id !== "all" && (
                  <span
                    className={cn(
                      "ml-0.5 tabular-nums text-[10px] opacity-60",
                      activeTab === tab.id && "opacity-100"
                    )}
                  >
                    {SHORTCUTS.filter((s) => s.category === tab.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Shortcut list ─────────────────────────────────────────── */}
        <ScrollArea className="max-h-[360px] px-5 py-3">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-white/30">
              <Search className="h-10 w-10 opacity-30" />
              <p className="text-sm">No shortcuts match "{search}"</p>
            </div>
          ) : (
            <ul className="space-y-1.5" role="list">
              {filtered.map((shortcut, index) => (
                <li
                  key={shortcut.id}
                  style={{
                    animation: `slide-up 0.28s ease-out ${index * 25}ms both`,
                  }}
                  className={cn(
                    "group flex items-center justify-between gap-4",
                    "px-3.5 py-2.5 rounded-xl",
                    "border border-l-2 border-transparent",
                    // Left-border accent on hover
                    "hover:border-white/[0.06] hover:bg-white/[0.04]",
                    "hover:" + categoryBorder[shortcut.category],
                    "transition-all duration-150",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Category icon badge */}
                    <span
                      className={cn(
                        "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                        "transition-all duration-150 group-hover:scale-110",
                        categoryAccent[shortcut.category],
                      )}
                    >
                      {shortcut.icon}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors duration-150 truncate">
                        {shortcut.description}
                      </p>
                      <p className="text-[10px] text-white/30 capitalize mt-px">{shortcut.category}</p>
                    </div>
                  </div>

                  {/* Key combo */}
                  <KeyCombo
                    keys={parseKeysForDisplay(shortcut.key)}
                    className="flex-shrink-0"
                  />
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer
          className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="flex items-center gap-2 text-[11px] text-white/30">
            <Sparkles className="h-3 w-3 text-[hsl(var(--primary)/0.6)] animate-status-pulse" />
            <span>Pro tip: Practice these shortcuts to save time per contest</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/30 flex-shrink-0">
            <span>Press</span>
            <KeyboardKey className="h-5 px-1.5 text-[10px] min-w-0">Esc</KeyboardKey>
            <span>to close</span>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
