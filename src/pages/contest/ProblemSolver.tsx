import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { FullscreenLockOverlay } from "@/components/FullscreenLockOverlay";
import {
  Clock,
  Play,
  Send,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Terminal,
  Maximize2,
  Minimize2,
  Shield,
  XCircle,
  CheckCircle2,
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
  
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  
  const [timeRemaining, setTimeRemaining] = useState<number>(3600);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [showDisqualified, setShowDisqualified] = useState(false);
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
    reportViolation,
    warningLimit,
  } = useAntiCheat({
    sessionId: session?.sessionId || "",
    onDisqualified: handleDisqualified,
    onWarning: handleWarning,
    enabled: !!session && !showFullscreenPrompt,
  });

  // Editor ref for Monaco instance
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Handle Monaco editor mount - disable clipboard operations
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Disable copy command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      reportViolation("Copy attempt blocked in editor");
    });

    // Disable cut command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      reportViolation("Cut attempt blocked in editor");
    });

    // Disable paste command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      reportViolation("Paste attempt blocked in editor");
    });

    // Disable context menu actions
    editor.addAction({
      id: "block-copy",
      label: "Copy (Blocked)",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      run: () => {
        reportViolation("Copy attempt blocked in editor");
      },
    });

    // Block drag and drop
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        reportViolation("Drag-and-drop blocked in editor");
      });

      editorDomNode.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Block paste via clipboard events
      editorDomNode.addEventListener("paste", (e) => {
        e.preventDefault();
        e.stopPropagation();
        reportViolation("Paste attempt blocked in editor");
      });

      // Block copy via clipboard events
      editorDomNode.addEventListener("copy", (e) => {
        e.preventDefault();
        e.stopPropagation();
        reportViolation("Copy attempt blocked in editor");
      });

      // Block cut via clipboard events
      editorDomNode.addEventListener("cut", (e) => {
        e.preventDefault();
        e.stopPropagation();
        reportViolation("Cut attempt blocked in editor");
      });
    }
  };

  // Handle re-enter fullscreen from lock overlay
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

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkSessionAndFetchData = async (sessionId: string) => {
    try {
      // Check if session is valid and not disqualified
      const { data: sessionData, error: sessionError } = await supabase
        .from("student_sessions")
        .select("is_disqualified, warnings")
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

      // Check if problem is already solved/locked
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

      // Record problem open time if not exists
      await supabase
        .from("student_problem_status")
        .upsert({
          session_id: sessionId,
          problem_id: problemId,
          opened_at: new Date().toISOString(),
        }, { onConflict: "session_id,problem_id" });

      // Fetch problem data
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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-timer-critical";
    if (timeRemaining <= 900) return "text-timer-warning";
    return "text-timer-normal";
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
    setConsoleOutput("🔄 Submitting code for evaluation against hidden test cases...\n");

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

      if (data.success) {
        setConsoleOutput(
          "✅ Submission Accepted!\n\n" +
          `All ${data.totalTestCases} hidden test cases passed.\n` +
          `Score: +${data.score} points\n` +
          `Execution Time: ${data.executionTime}ms\n\n` +
          "Redirecting to problem list..."
        );

        toast({
          title: "🎉 Problem Solved!",
          description: `You earned ${data.score} points!`,
        });

        // Redirect after success
        setTimeout(() => {
          navigate(`/contest/${contestId}`);
        }, 2500);
      } else {
        // Submission failed
        let statusMessage = "";
        switch (data.status) {
          case "wrong_answer":
            statusMessage = "❌ Wrong Answer";
            break;
          case "compilation_error":
            statusMessage = "❌ Compilation Error";
            break;
          case "runtime_error":
            statusMessage = "❌ Runtime Error";
            break;
          default:
            statusMessage = "❌ Failed";
        }

        setConsoleOutput(
          `${statusMessage}\n\n` +
          `Test Cases Passed: ${data.testCasesPassed}/${data.totalTestCases}\n` +
          `Failed at: Test Case ${data.failedTestCase}\n\n` +
          (data.error ? `Error Details:\n${data.error}\n\n` : "") +
          "Wrong attempts have been recorded."
        );

        toast({
          title: statusMessage,
          description: `Failed at test case ${data.failedTestCase}. Try again!`,
          variant: "destructive",
        });
        
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setConsoleOutput(`❌ Error: ${errorMessage}`);
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

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
            The following actions will result in warnings:
          </p>
          <ArenaCard className="text-left mb-6">
            <ArenaCardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Exiting fullscreen mode</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Switching tabs or minimizing</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Opening developer tools</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Copy/Cut/Paste (blocked everywhere)</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Right-click or drag-and-drop</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Page refresh or close attempt</span>
              </div>
            </ArenaCardContent>
          </ArenaCard>
          <p className="text-sm text-destructive mb-6">
            Warning limit: 15. Exceeding will result in disqualification.
          </p>
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden select-none">
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
            <div className="flex items-center gap-2">
              <Clock size={16} className={getTimerColor()} />
              <span className={`font-mono text-sm font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

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
              } />
              <span className={`text-sm font-medium ${
                warnings >= 10 ? "text-destructive" : warnings >= 5 ? "text-warning" : "text-foreground"
              }`}>
                {warnings} / {warningLimit}
              </span>
            </div>

            {/* Fullscreen indicator */}
            {!isFullscreen && (
              <Button
                variant="warning"
                size="sm"
                onClick={requestFullscreen}
              >
                <Maximize2 size={14} />
                Re-enter Fullscreen
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fullscreen Lock Overlay - shown when not in fullscreen and anti-cheat is active */}
        {!isFullscreen && !showFullscreenPrompt && session && (
          <FullscreenLockOverlay
            warnings={warnings}
            warningLimit={warningLimit}
            lastWarning={lastWarning}
            onReenterFullscreen={handleReenterFullscreen}
          />
        )}

        {/* Left Panel - Problem Description */}
        <div className="w-[400px] border-r border-border flex flex-col overflow-hidden">
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
                    <div
                      key={tc.id}
                      className="mb-4 rounded-lg border border-border overflow-hidden"
                    >
                      <div className="bg-background-secondary px-3 py-2 border-b border-border">
                        <span className="text-xs font-medium text-muted-foreground">
                          Example {index + 1}
                        </span>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Input:
                          </span>
                          <pre className="mt-1 p-2 rounded bg-editor-bg text-sm font-mono text-foreground overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Output:
                          </span>
                          <pre className="mt-1 p-2 rounded bg-editor-bg text-sm font-mono text-foreground overflow-x-auto">
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

        {/* Right Panel - Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Toolbar */}
          <div className="px-4 py-2 border-b border-border bg-background-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={selectedLanguage.id}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:border-primary"
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
                disabled={isRunning || isSubmitting || !isFullscreen}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Run
              </Button>
              <Button
                variant="arena"
                size="sm"
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || !isFullscreen}
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={selectedLanguage.monaco}
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                renderLineHighlight: "line",
                matchBrackets: "always",
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoIndent: "full",
                formatOnPaste: false,
                tabSize: 4,
                wordWrap: "on",
                padding: { top: 16 },
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                wordBasedSuggestions: "off",
                snippetSuggestions: "none",
                contextmenu: false,
                readOnly: !isFullscreen,
                dropIntoEditor: { enabled: false },
              }}
            />
          </div>

          {/* Console Output Panel */}
          <div
            className={`border-t border-border bg-console-bg transition-all duration-200 ${
              consoleExpanded ? "h-48" : "h-10"
            }`}
          >
            <div
              className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-background-secondary/50"
              onClick={() => setConsoleExpanded(!consoleExpanded)}
            >
              <div className="flex items-center gap-3">
                <Terminal size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Console</span>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                {consoleExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
            {consoleExpanded && (
              <div className="px-4 pb-4 h-[calc(100%-40px)] overflow-y-auto">
                <pre className="text-sm font-mono text-foreground-secondary whitespace-pre-wrap">
                  {consoleOutput || "Run your code to see output here..."}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
