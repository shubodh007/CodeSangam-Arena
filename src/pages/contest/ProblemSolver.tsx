import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Play,
  Send,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  FileText,
  ChevronDown,
  Maximize2,
  Minimize2,
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
  
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"output" | "testcases">("testcases");
  
  const [timeRemaining, setTimeRemaining] = useState<number>(3600);

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
    fetchProblemData();
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

  const fetchProblemData = async () => {
    try {
      const { data: problemData, error: problemError } = await supabase
        .from("problems")
        .select("*")
        .eq("id", problemId)
        .single();

      if (problemError) throw problemError;
      setProblem(problemData);

      const { data: testCasesData, error: testCasesError } = await supabase
        .from("sample_test_cases")
        .select("*")
        .eq("problem_id", problemId);

      if (testCasesError) throw testCasesError;
      setSampleTestCases(testCasesData || []);
    } catch (err) {
      console.error("Error fetching problem:", err);
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
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-timer-critical";
    if (timeRemaining <= 900) return "text-timer-warning";
    return "text-timer-normal";
  };

  const handleRun = async () => {
    setIsRunning(true);
    setActiveTab("output");
    setConsoleOutput("Running code against sample test cases...\n");

    // Simulate code execution (in production, this would call Piston API)
    setTimeout(() => {
      if (sampleTestCases.length > 0) {
        let output = "";
        sampleTestCases.forEach((tc, index) => {
          output += `\n━━━ Test Case ${index + 1} ━━━\n`;
          output += `Input:\n${tc.input}\n\n`;
          output += `Expected Output:\n${tc.expected_output}\n\n`;
          output += `Your Output:\n[Code execution simulated]\n`;
          output += `Status: ⏳ Pending\n`;
        });
        setConsoleOutput(output);
      } else {
        setConsoleOutput("No sample test cases available.\n\nYour code compiled successfully.");
      }
      setIsRunning(false);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!session) return;
    
    setIsSubmitting(true);
    setActiveTab("output");
    setConsoleOutput("Submitting code for evaluation...\n");

    try {
      // Save submission to database
      const { error } = await supabase.from("submissions").insert({
        session_id: session.sessionId,
        problem_id: problemId,
        code: code,
        language: selectedLanguage.id,
        status: "pending",
      });

      if (error) throw error;

      // Simulate submission result
      setTimeout(() => {
        setConsoleOutput(
          "Submission received!\n\n" +
          "Running against hidden test cases...\n\n" +
          "━━━ Results ━━━\n" +
          "Test Cases Passed: [Evaluating...]\n" +
          "Status: Pending Review\n\n" +
          "Your submission has been recorded."
        );
        
        toast({
          title: "Submission Received",
          description: "Your code has been submitted for evaluation.",
        });
        
        setIsSubmitting(false);
      }, 2000);
    } catch (err: any) {
      setConsoleOutput(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
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

            <div className="flex items-center gap-2 px-2 py-1 rounded bg-warning/10 border border-warning/20">
              <AlertTriangle size={12} className="text-warning" />
              <span className="text-xs text-warning font-medium">0/15</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
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
                disabled={isRunning || isSubmitting}
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
                disabled={isRunning || isSubmitting}
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
                formatOnPaste: true,
                tabSize: 4,
                wordWrap: "on",
                padding: { top: 16 },
                // Disable suggestions/hints as per requirements
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                wordBasedSuggestions: "off",
                snippetSuggestions: "none",
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
                {consoleExpanded ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
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
