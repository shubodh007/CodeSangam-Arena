import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";

interface Problem {
  id: string;
  title: string;
  description: string;
  score: number;
  sample_test_cases: { input: string; output: string }[];
  hidden_test_cases: { input: string; expected_output: string }[];
  isExpanded: boolean;
}

export default function CreateContest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Contest Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(false);

  // Problems
  const [problems, setProblems] = useState<Problem[]>([]);

  const addProblem = () => {
    const newProblem: Problem = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      score: 100,
      sample_test_cases: [{ input: "", output: "" }],
      hidden_test_cases: [{ input: "", expected_output: "" }],
      isExpanded: true,
    };
    setProblems([...problems, newProblem]);
  };

  const updateProblem = (id: string, updates: Partial<Problem>) => {
    setProblems(problems.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeProblem = (id: string) => {
    setProblems(problems.filter(p => p.id !== id));
  };

  const moveProblem = (id: string, dir: 1 | -1) => {
    const idx = problems.findIndex(p => p.id === id);
    const next = idx + dir;
    if (next < 0 || next >= problems.length) return;
    const reordered = [...problems];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setProblems(reordered);
  };

  const addSampleTestCase = (problemId: string) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        return {
          ...p,
          sample_test_cases: [...p.sample_test_cases, { input: "", output: "" }]
        };
      }
      return p;
    }));
  };

  const updateSampleTestCase = (problemId: string, index: number, field: "input" | "output", value: string) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        const updated = [...p.sample_test_cases];
        updated[index] = { ...updated[index], [field]: value };
        return { ...p, sample_test_cases: updated };
      }
      return p;
    }));
  };

  const removeSampleTestCase = (problemId: string, index: number) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        return {
          ...p,
          sample_test_cases: p.sample_test_cases.filter((_, i) => i !== index)
        };
      }
      return p;
    }));
  };

  const addHiddenTestCase = (problemId: string) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        return {
          ...p,
          hidden_test_cases: [...p.hidden_test_cases, { input: "", expected_output: "" }]
        };
      }
      return p;
    }));
  };

  const updateHiddenTestCase = (problemId: string, index: number, field: "input" | "expected_output", value: string) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        const updated = [...p.hidden_test_cases];
        updated[index] = { ...updated[index], [field]: value };
        return { ...p, hidden_test_cases: updated };
      }
      return p;
    }));
  };

  const removeHiddenTestCase = (problemId: string, index: number) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        return {
          ...p,
          hidden_test_cases: p.hidden_test_cases.filter((_, i) => i !== index)
        };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Contest title is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      // Create contest
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .insert({
          title: title.trim(),
          description: description.trim(),
          duration_minutes: duration,
          is_active: isActive,
        })
        .select()
        .single();

      if (contestError) throw contestError;

      // Create problems with test cases
      for (const problem of problems) {
        if (!problem.title.trim()) continue;

        const { data: createdProblem, error: problemError } = await supabase
          .from("problems")
          .insert({
            contest_id: contest.id,
            title: problem.title.trim(),
            description: problem.description.trim(),
            score: problem.score,
          })
          .select()
          .single();

        if (problemError) throw problemError;

        // Insert sample test cases
        for (const testCase of problem.sample_test_cases) {
          if (testCase.input.trim() || testCase.output.trim()) {
            await supabase.from("sample_test_cases").insert({
              problem_id: createdProblem.id,
              input: testCase.input,
              expected_output: testCase.output,
            });
          }
        }

        // Insert hidden test cases
        for (const testCase of problem.hidden_test_cases) {
          if (testCase.input.trim() || testCase.expected_output.trim()) {
            await supabase.from("hidden_test_cases").insert({
              problem_id: createdProblem.id,
              input: testCase.input,
              expected_output: testCase.expected_output,
            });
          }
        }
      }

      toast({ title: "Success", description: "Contest created successfully!" });
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create contest", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Create Contest</h1>
          </div>
          <Button variant="arena" onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Contest
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Contest Details */}
        <ArenaCard className="mb-6">
          <ArenaCardHeader>
            <h2 className="text-lg font-semibold">Contest Details</h2>
          </ArenaCardHeader>
          <ArenaCardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                variant="arena"
                placeholder="e.g., Weekly Coding Challenge #1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full h-24 px-4 py-3 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                placeholder="Describe the contest..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  variant="arena"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex items-center gap-3 h-12">
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isActive ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {isActive ? "Active (visible to students)" : "Inactive (hidden)"}
                  </span>
                </div>
              </div>
            </div>
          </ArenaCardContent>
        </ArenaCard>

        {/* Problems Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Problems ({problems.length})</h2>
          <Button variant="arena-outline" onClick={addProblem}>
            <Plus size={16} />
            Add Problem
          </Button>
        </div>

        {problems.length === 0 ? (
          <ArenaCard>
            <ArenaCardContent className="py-12 text-center">
              <FileText size={40} className="mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No problems added yet</p>
              <Button variant="arena" className="mt-4" onClick={addProblem}>
                <Plus size={16} />
                Add First Problem
              </Button>
            </ArenaCardContent>
          </ArenaCard>
        ) : (
          <div className="space-y-4">
            {problems.map((problem, index) => (
              <ArenaCard key={problem.id}>
                <ArenaCardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={index === 0}
                      onClick={() => moveProblem(problem.id, -1)}
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={index === problems.length - 1}
                      onClick={() => moveProblem(problem.id, 1)}
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </Button>
                  </div>
                  <button
                    onClick={() => updateProblem(problem.id, { isExpanded: !problem.isExpanded })}
                    className="flex items-center gap-3 flex-1 text-left ml-1"
                  >
                    <span className="font-medium">
                      Problem {index + 1}: {problem.title || "Untitled"}
                    </span>
                    <span className="text-sm text-primary">({problem.score} pts)</span>
                    {problem.isExpanded ? (
                      <ChevronUp size={16} className="text-muted-foreground ml-auto" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground ml-auto" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProblem(problem.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </ArenaCardHeader>

                {problem.isExpanded && (
                  <ArenaCardContent className="space-y-6 border-t border-border">
                    {/* Problem Details */}
                    <div className="grid gap-4 pt-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                          <label className="text-sm font-medium">Title *</label>
                          <Input
                            variant="arena"
                            placeholder="Problem title"
                            value={problem.title}
                            onChange={(e) => updateProblem(problem.id, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Score</label>
                          <Input
                            variant="arena"
                            type="number"
                            min={1}
                            value={problem.score}
                            onChange={(e) => updateProblem(problem.id, { score: parseInt(e.target.value) || 100 })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          className="w-full h-32 px-4 py-3 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none font-mono text-sm"
                          placeholder="Describe the problem, constraints, and examples..."
                          value={problem.description}
                          onChange={(e) => updateProblem(problem.id, { description: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Sample Test Cases */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye size={16} className="text-primary" />
                          <span className="text-sm font-medium">Sample Test Cases (Visible)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSampleTestCase(problem.id)}
                        >
                          <Plus size={14} />
                          Add
                        </Button>
                      </div>
                      {problem.sample_test_cases.map((tc, tcIndex) => (
                        <div key={tcIndex} className="grid grid-cols-2 gap-3 p-3 rounded-md bg-background-secondary border border-border">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Input</label>
                            <textarea
                              className="w-full h-20 px-3 py-2 rounded-md border border-border bg-input text-sm font-mono resize-none focus:border-primary focus:outline-none"
                              placeholder="Sample input..."
                              value={tc.input}
                              onChange={(e) => updateSampleTestCase(problem.id, tcIndex, "input", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1 relative">
                            <label className="text-xs text-muted-foreground">Expected Output</label>
                            <textarea
                              className="w-full h-20 px-3 py-2 rounded-md border border-border bg-input text-sm font-mono resize-none focus:border-primary focus:outline-none"
                              placeholder="Expected output..."
                              value={tc.output}
                              onChange={(e) => updateSampleTestCase(problem.id, tcIndex, "output", e.target.value)}
                            />
                            {problem.sample_test_cases.length > 1 && (
                              <button
                                onClick={() => removeSampleTestCase(problem.id, tcIndex)}
                                className="absolute top-1 right-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hidden Test Cases */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <EyeOff size={16} className="text-warning" />
                          <span className="text-sm font-medium">Hidden Test Cases (For Submission)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addHiddenTestCase(problem.id)}
                        >
                          <Plus size={14} />
                          Add
                        </Button>
                      </div>
                      {problem.hidden_test_cases.map((tc, tcIndex) => (
                        <div key={tcIndex} className="grid grid-cols-2 gap-3 p-3 rounded-md bg-warning/5 border border-warning/20">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Hidden Input</label>
                            <textarea
                              className="w-full h-20 px-3 py-2 rounded-md border border-border bg-input text-sm font-mono resize-none focus:border-primary focus:outline-none"
                              placeholder="Hidden input..."
                              value={tc.input}
                              onChange={(e) => updateHiddenTestCase(problem.id, tcIndex, "input", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1 relative">
                            <label className="text-xs text-muted-foreground">Expected Output</label>
                            <textarea
                              className="w-full h-20 px-3 py-2 rounded-md border border-border bg-input text-sm font-mono resize-none focus:border-primary focus:outline-none"
                              placeholder="Expected output..."
                              value={tc.expected_output}
                              onChange={(e) => updateHiddenTestCase(problem.id, tcIndex, "expected_output", e.target.value)}
                            />
                            {problem.hidden_test_cases.length > 1 && (
                              <button
                                onClick={() => removeHiddenTestCase(problem.id, tcIndex)}
                                className="absolute top-1 right-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ArenaCardContent>
                )}
              </ArenaCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
