import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { CustomTestPanel } from "@/components/CustomTestPanel";
import { SubmissionFeedback, type SubmissionState } from "@/components/feedback/SubmissionFeedback";
import { RunOutput } from "@/components/feedback/RunOutput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useEnhancedAntiCheat } from "@/hooks/useEnhancedAntiCheat";
import { ViolationWarning } from "@/components/contest/ViolationWarning";
import { useContestTimer } from "@/hooks/useContestTimer";
import { useRealtimeContest } from "@/hooks/useRealtimeContest";
import { FullscreenLockOverlay } from "@/components/FullscreenLockOverlay";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { defineArenaTheme } from "@/lib/monaco-theme";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useKeyboardStore } from "@/store/keyboardStore";
import {
  Clock,
  Play,
  Send,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Terminal,
  Maximize2,
  Shield,
  XCircle,
  CheckCircle2,
  Keyboard,
} from "lucide-react";

interface Problem {
  id: string;
  title: string;
  description: string;
  score: number;
}

interface SampleTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface SessionData {
  sessionId: string;
  contestId: string;
  username: string;
}

const LANGUAGES = [
  { id: "python", name: "Python", monaco: "python", template: '# Write your solution here\n\ndef solve():\n    pass\n\nsolve()' },
  { id: "java", name: "Java", monaco: "java", template: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}' },
  { id: "c", name: "C", monaco: "c", template: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}' },
  { id: "cpp", name: "C++", monaco: "cpp", template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}' },
  { id: "go", name: "Go", monaco: "go", template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}' },
];

export default function ProblemSolver() {
  const { contestId, problemId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sampleTestCases, setSampleTestCases] = useState<SampleTestCase[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProblemLocked, setIsProblemLocked] = useState(false);
  const [contestDuration, setContestDuration] = useState(60);
  
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: "idle" });
  const [activeMobileTab, setActiveMobileTab] = useState<"problem" | "code" | "console">("code");

  const isMobile = useMediaQuery("(max-width: 767px)");
  
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [showContestEnded, setShowContestEnded] = useState(false);
  const [lastWarning, setLastWarning] = useState<string>("");

  // Anti-cheat system
  const handleDisqualified = useCallback(() => {
    setShowDisqualified(true);
    localStorage.removeItem("arena_session");
  }, []);

  const handleWarning = useCallback((count: number, reason: string) => {
    setLastWarning(reason);
    toast({
      title: `⚠️ Warning ${count} / 15`,
      description: reason,
      variant: "destructive",
    });
  }, [toast]);

  const {
    warnings,
    isDisqualified,
    isFullscreen,
    requestFullscreen,
    fetchWarnings,
    warningLimit,
    reportViolation,
  } = useAntiCheat({
    sessionId: session?.sessionId || "",
    onDisqualified: handleDisqualified,
    onWarning: handleWarning,
    enabled: !!session && !showFullscreenPrompt,
  });

  // Enhanced anti-cheat: additional OS-level detections (Alt+Tab, Windows key,
  // screenshot shortcuts, virtual desktop, multi-monitor mouse leave).
  // Feeds violations through the same reportViolation path so warning state,
  // toasts, and disqualification logic remain unified.
  useEnhancedAntiCheat({
    reportViolation,
    enabled: !!session && !showFullscreenPrompt,
  });

  // Server-driven contest timer
  const handleTimeUp = useCallback(() => {
    setShowContestEnded(true);
    toast({
      title: "⏰ Time's Up!",
      description: "The contest has ended. Your work has been saved.",
      variant: "destructive",
    });
  }, [toast]);

  const {
    formattedTime,
    timerColorClass,
    isExpired,
    isWarning: timerWarning,
    isCritical: timerCritical,
  } = useContestTimer({
    sessionId: session?.sessionId || "",
    contestId: contestId || "",
    durationMinutes: contestDuration,
    enabled: !!session && !showFullscreenPrompt,
    onTimeUp: handleTimeUp,
  });

  // Real-time contest updates
  const handleContestDeactivated = useCallback(() => {
    toast({
      title: "Contest Ended",
      description: "This contest has been deactivated by the administrator.",
      variant: "destructive",
    });
    setShowContestEnded(true);
  }, [toast]);

  const { contest: realtimeContest } = useRealtimeContest({
    contestId: contestId || "",
    onContestDeactivated: handleContestDeactivated,
  });

  useEffect(() => {
    if (realtimeContest?.duration_minutes) {
      setContestDuration(realtimeContest.duration_minutes);
    }
  }, [realtimeContest]);

  // ── Heartbeat: tell the admin monitor we are online & what problem we're on ──
  const sendHeartbeat = useCallback((sid: string, pid: string, typing: boolean) => {
    supabase.functions.invoke("execute-code", {
      body: { mode: "heartbeat", sessionId: sid, currentProblemId: pid, isTyping: typing },
    });
  }, []);

  useEffect(() => {
    if (!session?.sessionId || !problemId) return;
    // Send an immediate ping so admin sees the student without waiting 30 s
    sendHeartbeat(session.sessionId, problemId, false);
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat(session.sessionId!, problemId!, isTypingRef.current);
    }, 30_000);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [session?.sessionId, problemId, sendHeartbeat]);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Stable refs for Monaco command callbacks (avoids re-registration on every render)
  const handleRunRef    = useRef<() => void>(() => {});
  const handleSubmitRef = useRef<() => void>(() => {});
  const handleSaveRef   = useRef<() => void>(() => {});

  // Heartbeat / typing-presence refs
  const isTypingRef           = useRef(false);
  const typingTimeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
    isTypingRef.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 5_000);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register and apply the custom arena-dark theme
    defineArenaTheme(monaco);
    editor.updateOptions({ theme: "arena-dark" });

    // Block copy/paste/cut (anti-cheat)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {});

    // Keyboard shortcuts — call through refs so callbacks are always fresh
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      handleRunRef.current();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSubmitRef.current();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRef.current();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      editor.trigger("keyboard", "editor.action.formatDocument", {});
    });

    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener("drop", (e) => { e.preventDefault(); e.stopPropagation(); });
      editorDomNode.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); });
      editorDomNode.addEventListener("paste", (e) => { e.preventDefault(); e.stopPropagation(); });
      editorDomNode.addEventListener("copy", (e) => { e.preventDefault(); e.stopPropagation(); });
      editorDomNode.addEventListener("cut", (e) => { e.preventDefault(); e.stopPropagation(); });
    }
  };

  const handleReenterFullscreen = async () => {
    await requestFullscreen();
  };

  useEffect(() => {
    const storedSession = localStorage.getItem("arena_session");
    if (!storedSession) {
      navigate("/student/entry");
      return;
    }

    const sessionData: SessionData = JSON.parse(storedSession);
    if (sessionData.contestId !== contestId) {
      navigate("/student/entry");
      return;
    }

    setSession(sessionData);
    checkSessionAndFetchData(sessionData.sessionId);
  }, [contestId, problemId]);

  const checkSessionAndFetchData = async (sessionId: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("student_sessions")
        .select("is_disqualified, warnings, contest_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        navigate("/student/entry");
        return;
      }

      if (sessionData.is_disqualified) {
        setShowDisqualified(true);
        return;
      }

      const { data: contestData } = await supabase
        .from("contests")
        .select("duration_minutes, is_active")
        .eq("id", contestId)
        .single();

      if (contestData) {
        setContestDuration(contestData.duration_minutes);
        if (!contestData.is_active) {
          setShowContestEnded(true);
          return;
        }
      }

      const { data: statusData } = await supabase
        .from("student_problem_status")
        .select("is_locked, accepted_at")
        .eq("session_id", sessionId)
        .eq("problem_id", problemId)
        .single();

      if (statusData?.is_locked || statusData?.accepted_at) {
        setIsProblemLocked(true);
        toast({
          title: "Problem Already Solved",
          description: "You have already solved this problem. Redirecting...",
        });
        setTimeout(() => navigate(`/contest/${contestId}`), 2000);
        return;
      }

      await supabase
        .from("student_problem_status")
        .upsert({
          session_id: sessionId,
          problem_id: problemId,
          opened_at: new Date().toISOString(),
        }, { onConflict: "session_id,problem_id" });

      const { data: problemData, error: problemError } = await supabase
        .from("problems")
        .select("*")
        .eq("id", problemId)
        .single();

      if (problemError) throw problemError;
      setProblem(problemData);

      const { data: testCasesData } = await supabase
        .from("sample_test_cases")
        .select("*")
        .eq("problem_id", problemId);

      setSampleTestCases(testCasesData || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (langId: string) => {
    const lang = LANGUAGES.find((l) => l.id === langId);
    if (lang) {
      setSelectedLanguage(lang);
      setCode(lang.template);
    }
  };

  const handleEnterFullscreen = async () => {
    await requestFullscreen();
    setShowFullscreenPrompt(false);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setConsoleOutput("🔄 Running code against sample test cases...\n");

    if (sampleTestCases.length === 0) {
      setConsoleOutput("No sample test cases available.\n\nTrying to compile your code...");
      
      try {
        const { data, error } = await supabase.functions.invoke("execute-code", {
          body: {
            code,
            language: selectedLanguage.id,
            input: "",
            mode: "run",
            sessionId: session?.sessionId,
          },
        });

        if (error) throw error;

        if (data.success) {
          setConsoleOutput(`✅ Code compiled and ran successfully!\n\nOutput:\n${data.output || "(no output)"}`);
        } else {
          setConsoleOutput(`❌ ${data.error || "Execution failed"}`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setConsoleOutput(`❌ Error: ${errorMessage}`);
      }
      setIsRunning(false);
      return;
    }

    let output = "";
    let allPassed = true;

    for (let i = 0; i < sampleTestCases.length; i++) {
      const tc = sampleTestCases[i];
      output += `\n━━━ Test Case ${i + 1} ━━━\n`;
      output += `Input:\n${tc.input}\n\n`;
      output += `Expected Output:\n${tc.expected_output}\n\n`;
      setConsoleOutput(output + `⏳ Running...\n`);

      try {
        const { data, error } = await supabase.functions.invoke("execute-code", {
          body: {
            code,
            language: selectedLanguage.id,
            input: tc.input,
            mode: "run",
            sessionId: session?.sessionId,
          },
        });

        if (error) throw error;

        if (data.success) {
          const normalizedOutput = data.output.trim();
          const normalizedExpected = tc.expected_output.trim();
          const passed = normalizedOutput === normalizedExpected;
          
          output += `Your Output:\n${data.output || "(no output)"}\n`;
          output += `Status: ${passed ? "✅ Passed" : "❌ Failed"}\n`;
          
          if (!passed) allPassed = false;
        } else {
          output += `Error:\n${data.error}\n`;
          output += `Status: ❌ Error\n`;
          allPassed = false;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        output += `Error: ${errorMessage}\n`;
        output += `Status: ❌ Error\n`;
        allPassed = false;
      }
    }

    output += `\n━━━ Summary ━━━\n`;
    output += allPassed 
      ? `✅ All ${sampleTestCases.length} sample test cases passed!`
      : `❌ Some test cases failed. Check your solution.`;
    
    setConsoleOutput(output);
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!session) return;

    setIsSubmitting(true);
    setSubmissionState({ status: "running" });
    // Switch to console tab to show feedback
    if (isMobile) setActiveMobileTab("console");

    try {
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: {
          code,
          language: selectedLanguage.id,
          input: "",
          mode: "submit",
          sessionId: session.sessionId,
          problemId: problemId,
        },
      });

      if (error) throw error;

      if (data.status === "accepted") {
        setSubmissionState({
          status: "accepted",
          score: data.score,
          maxScore: data.maxScore,
          totalTestCases: data.totalTestCases,
          executionTime: data.executionTime,
        });

        toast({
          title: "Problem Solved!",
          description: `You earned ${data.score} points!`,
        });

        setTimeout(() => {
          navigate(`/contest/${contestId}`);
        }, 2500);
      } else if (data.status === "partial") {
        setSubmissionState({
          status: "partial",
          score: data.score,
          maxScore: data.maxScore,
          testCasesPassed: data.testCasesPassed,
          totalTestCases: data.totalTestCases,
        });

        toast({
          title: "Partial Solution",
          description: `${data.testCasesPassed}/${data.totalTestCases} test cases passed (${data.score} pts). Keep going!`,
        });

        setIsSubmitting(false);
      } else {
        setSubmissionState({
          status: "failed",
          testCasesPassed: data.testCasesPassed ?? 0,
          totalTestCases: data.totalTestCases ?? 1,
          error: data.error,
        });

        toast({
          title: "Submission Failed",
          description: "No test cases passed. Check your solution and try again.",
          variant: "destructive",
        });

        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setSubmissionState({
        status: "failed",
        testCasesPassed: 0,
        totalTestCases: 1,
        error: errorMessage,
      });
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const { setModalOpen } = useKeyboardStore();

  const handleSaveCode = useCallback(() => {
    const key = `code_${contestId}_${problemId}_${selectedLanguage.id}`;
    localStorage.setItem(key, code);
    toast({ title: "Code saved", description: "Saved locally to this browser" });
  }, [contestId, problemId, selectedLanguage.id, code, toast]);

  // Keep refs fresh so Monaco commands always call the latest version
  handleRunRef.current    = handleRun;
  handleSubmitRef.current = handleSubmit;
  handleSaveRef.current   = handleSaveCode;

  // Window-level shortcuts (fires when focus is outside Monaco)
  useKeyboardShortcuts(
    [
      {
        key: "ctrl+r",
        description: "Run code",
        action: handleRun,
        enabled: isFullscreen && !isExpired && !isRunning && !isSubmitting,
      },
      {
        key: "ctrl+enter",
        description: "Submit solution",
        action: handleSubmit,
        enabled: isFullscreen && !isExpired && !isRunning && !isSubmitting,
      },
      {
        key: "ctrl+s",
        description: "Save code",
        action: handleSaveCode,
        enabled: true,
      },
      {
        key: "?",
        description: "Show shortcuts",
        action: () => setModalOpen(true),
        enabled: true,
      },
    ],
    { context: "outside-monaco", preventDefault: true }
  );

  // Disqualified screen
  if (showDisqualified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Disqualified</h1>
          <p className="text-muted-foreground mb-6">
            You have been disqualified from this contest due to exceeding the warning limit.
            Your contest session has ended.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Contest ended screen
  if (showContestEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Contest Ended</h1>
          <p className="text-muted-foreground mb-6">
            This contest has ended. Thank you for participating.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Problem locked screen
  if (isProblemLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Already Solved</h1>
          <p className="text-muted-foreground mb-6">
            You have already solved this problem. Redirecting to problem list...
          </p>
        </div>
      </div>
    );
  }

  // Fullscreen prompt
  if (showFullscreenPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Proctored Environment</h1>
          <p className="text-muted-foreground mb-6">
            This is a proctored coding contest. You must enter fullscreen mode to continue.
          </p>
          <ArenaCard className="text-left mb-6">
            <ArenaCardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Shield size={14} className="text-primary" />
                <span>Copy/Paste/Cut disabled in editor (typing only)</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Exiting fullscreen, tab switch, minimize = warning</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>DevTools, right-click outside editor = warning</span>
              </div>
              <div className="flex items-center gap-2 text-destructive">
                <XCircle size={14} />
                <span>15 warnings = automatic disqualification</span>
              </div>
            </ArenaCardContent>
          </ArenaCard>
          <Button variant="arena" size="lg" onClick={handleEnterFullscreen}>
            <Maximize2 size={18} />
            Enter Fullscreen & Start
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
          <h1 className="text-xl font-semibold mb-2">Problem Not Found</h1>
          <Button variant="arena" onClick={() => navigate(`/contest/${contestId}`)}>
            Back to Problems
          </Button>
        </div>
      </div>
    );
  }

  // ── Shared panel content (used in both desktop + mobile layouts) ──────────

  const ProblemPanelContent = (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-background-secondary/30">
        <h2 className="font-semibold text-foreground">{problem.title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <h3 className="text-sm font-semibold text-foreground mb-3">Description</h3>
          <div className="text-sm text-foreground-secondary whitespace-pre-wrap mb-6">
            {problem.description || "No description provided."}
          </div>

          {sampleTestCases.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Sample Test Cases
              </h3>
              {sampleTestCases.map((tc, index) => (
                <div key={tc.id} className="mb-4 rounded-lg border border-border overflow-hidden">
                  <div className="bg-background-secondary px-3 py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      Example {index + 1}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Input:</span>
                      <pre className="mt-1 p-2 rounded bg-[hsl(var(--editor-bg))] text-sm font-mono text-foreground overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Output:</span>
                      <pre className="mt-1 p-2 rounded bg-[hsl(var(--editor-bg))] text-sm font-mono text-foreground overflow-x-auto">
                        {tc.expected_output}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const EditorPanelContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="px-4 py-2 border-b border-border bg-background-secondary/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <select
            value={selectedLanguage.id}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:border-primary"
            aria-label="Select programming language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="arena-secondary"
            size="sm"
            onClick={handleRun}
            disabled={isRunning || isSubmitting || !isFullscreen || isExpired}
            title="Run code (Ctrl+R)"
            aria-label="Run code against sample test cases"
          >
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
            Run
            <span className="hidden lg:inline-flex ml-1 font-mono text-[9px] opacity-50 border border-current/30 rounded px-1" aria-hidden="true">⌃R</span>
          </Button>
          <Button
            variant="arena"
            size="sm"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting || !isFullscreen || isExpired}
            title="Submit solution (Ctrl+Enter)"
            aria-label="Submit solution for evaluation"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={14} aria-hidden="true" />
            )}
            Submit
            <span className="hidden lg:inline-flex ml-1 font-mono text-[9px] opacity-50 border border-current/30 rounded px-1" aria-hidden="true">⌃↵</span>
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={selectedLanguage.monaco}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="arena-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            padding: { top: 16, bottom: 16 },
            folding: true,
            foldingHighlight: true,
            foldingStrategy: "indentation",
            showFoldingControls: "mouseover",
            renderLineHighlight: "line",
            renderLineHighlightOnlyWhenFocus: false,
            matchBrackets: "always",
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingDelete: "always",
            autoSurround: "languageDefined",
            autoIndent: "full",
            formatOnPaste: false,
            formatOnType: false,
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: true,
            wordWrap: "on",
            wrappingIndent: "same",
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            parameterHints: { enabled: false },
            wordBasedSuggestions: "off",
            snippetSuggestions: "none",
            suggest: { enabled: false },
            inlineSuggest: { enabled: false },
            contextmenu: false,
            readOnly: !isFullscreen || isExpired,
            dropIntoEditor: { enabled: false },
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorWidth: 2,
            smoothScrolling: true,
            colorDecorators: true,
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );

  const ConsolePanelContent = (
    <Tabs defaultValue="console" className="h-full flex flex-col border-t border-border">
      <TabsList className="flex-shrink-0 h-8 rounded-none border-b border-border bg-[hsl(var(--console-bg))] justify-start px-3 gap-1">
        <TabsTrigger
          value="console"
          className="h-6 px-3 text-xs data-[state=active]:bg-background-secondary/60"
        >
          <Terminal size={11} className="mr-1.5" aria-hidden="true" />
          Console
          {(isRunning || isSubmitting) && (
            <Loader2 size={10} className="ml-1.5 animate-spin text-primary" aria-hidden="true" />
          )}
        </TabsTrigger>
        <TabsTrigger
          value="custom"
          className="h-6 px-3 text-xs data-[state=active]:bg-background-secondary/60"
        >
          Custom Tests
        </TabsTrigger>
      </TabsList>

      {/* Console tab */}
      <TabsContent
        value="console"
        className="flex-1 overflow-y-auto m-0 px-4 py-3 bg-[hsl(var(--console-bg))] space-y-3"
      >
        {/* Submission result with aria-live */}
        <div aria-live="polite" aria-atomic="true">
          <SubmissionFeedback state={submissionState} />
        </div>

        {/* Run output */}
        {consoleOutput ? (
          <RunOutput output={consoleOutput} />
        ) : submissionState.status === "idle" ? (
          <p className="text-sm text-muted-foreground font-mono">
            Run your code to see output here...
          </p>
        ) : null}
      </TabsContent>

      {/* Custom Tests tab */}
      <TabsContent value="custom" className="flex-1 overflow-hidden m-0">
        {session && problem && (
          <CustomTestPanel
            sessionId={session.sessionId}
            problemId={problem.id}
            code={code}
            language={selectedLanguage.id}
            disabled={!isFullscreen || isExpired}
          />
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden select-none">
      {/* Skip-to-content */}
      <a
        href="#problem-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-1.5 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Violation warning banner — auto-dismisses after 4 s */}
      <ViolationWarning lastViolationReason={lastWarning} />

      {/* Header */}
      <header className="border-b border-border bg-background-secondary/50 flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/contest/${contestId}`)}
            >
              <ChevronLeft size={16} />
              Problems
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {problem.title}
              </span>
              <span className="text-xs text-primary font-medium px-2 py-0.5 rounded bg-primary/10">
                {problem.score} pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
              timerCritical
                ? "bg-destructive/10 border-destructive/30 animate-pulse"
                : timerWarning
                  ? "bg-warning/10 border-warning/30"
                  : "bg-secondary border-border"
            }`}>
              <Clock size={16} className={timerColorClass} aria-hidden="true" />
              <span className={`font-mono text-sm font-bold ${timerColorClass}`}>
                {formattedTime}
              </span>
              {timerCritical && (
                <span className="text-xs text-destructive font-medium">HURRY!</span>
              )}
            </div>

            {/* Accessible timer announcement (screen reader only) */}
            <span aria-live="assertive" aria-atomic="true" className="sr-only">
              {timerCritical
                ? `Critical: ${formattedTime} remaining`
                : timerWarning
                ? `Warning: ${formattedTime} remaining`
                : ""}
            </span>

            {/* Warning Counter */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
              warnings >= 10
                ? "bg-destructive/10 border-destructive/20"
                : warnings >= 5
                  ? "bg-warning/10 border-warning/20"
                  : "bg-secondary border-border"
            }`}>
              <AlertTriangle size={14} className={
                warnings >= 10 ? "text-destructive" : warnings >= 5 ? "text-warning" : "text-muted-foreground"
              } aria-hidden="true" />
              <span className={`text-sm font-medium ${
                warnings >= 10 ? "text-destructive" : warnings >= 5 ? "text-warning" : "text-foreground"
              }`} aria-label={`${warnings} of ${warningLimit} warnings`}>
                {warnings} / {warningLimit}
              </span>
            </div>

            {/* Fullscreen indicator */}
            {!isFullscreen && (
              <Button variant="warning" size="sm" onClick={requestFullscreen}>
                <Maximize2 size={14} />
                Re-enter Fullscreen
              </Button>
            )}

            {/* Keyboard shortcuts button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground group"
              title="Keyboard shortcuts (?)"
              aria-label="Open keyboard shortcuts"
            >
              <Keyboard size={14} className="group-hover:text-primary transition-colors" aria-hidden="true" />
              <span className="hidden lg:inline text-xs">Shortcuts</span>
              <span className="hidden lg:inline text-xs font-mono border border-border rounded px-1 py-px text-[10px] opacity-60" aria-hidden="true">?</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="problem-main" className="flex-1 flex overflow-hidden">
        {/* Fullscreen Lock Overlay */}
        {!isFullscreen && !showFullscreenPrompt && session && (
          <FullscreenLockOverlay
            warnings={warnings}
            warningLimit={warningLimit}
            lastWarning={lastWarning}
            onReenterFullscreen={handleReenterFullscreen}
          />
        )}

        {/* ── DESKTOP LAYOUT (≥ 768px) ── */}
        {!isMobile && (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Left Panel - Problem Description */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              {ProblemPanelContent}
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Editor + Console */}
            <ResizablePanel defaultSize={70} minSize={40}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={70} minSize={30}>
                  {EditorPanelContent}
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={35} minSize={15} maxSize={65}>
                  {ConsolePanelContent}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* ── MOBILE LAYOUT (< 768px) ── */}
        {isMobile && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile tab content — editor always mounted to preserve code */}
            <div className="flex-1 overflow-hidden relative">
              <div className={activeMobileTab === "problem" ? "h-full flex flex-col overflow-hidden" : "sr-only overflow-hidden h-0 pointer-events-none"}>
                {ProblemPanelContent}
              </div>
              <div className={activeMobileTab === "code" ? "h-full flex flex-col overflow-hidden" : "sr-only overflow-hidden h-0 pointer-events-none"}>
                {EditorPanelContent}
              </div>
              <div className={activeMobileTab === "console" ? "h-full flex flex-col overflow-hidden" : "sr-only overflow-hidden h-0 pointer-events-none"}>
                {ConsolePanelContent}
              </div>
            </div>

            {/* Mobile bottom tab bar */}
            <div className="flex-shrink-0 border-t border-border bg-background-secondary/50 flex">
              {(["problem", "code", "console"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                    activeMobileTab === tab
                      ? "text-primary border-t-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveMobileTab(tab)}
                  aria-current={activeMobileTab === tab ? "page" : undefined}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
