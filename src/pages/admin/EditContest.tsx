import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface SampleTestCase {
  id?: string;
  input: string;
  output: string;
}

interface HiddenTestCase {
  id?: string;
  input: string;
  expected_output: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  score: number;
  sample_test_cases: SampleTestCase[];
  hidden_test_cases: HiddenTestCase[];
  isExpanded: boolean;
  isNew?: boolean;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
}

export default function EditContest() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Contest Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(false);

  // Problems
  const [problems, setProblems] = useState<Problem[]>([]);

  // Track deleted items for cleanup
  const [deletedProblems, setDeletedProblems] = useState<string[]>([]);
  const [deletedSampleCases, setDeletedSampleCases] = useState<string[]>([]);
  const [deletedHiddenCases, setDeletedHiddenCases] = useState<string[]>([]);

  useEffect(() => {
    checkAuthAndFetch();
  }, [contestId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/admin/login");
      return;
    }

    // Verify admin role using authoritative user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate("/admin/login");
      return;
    }

    await fetchContestData();
  };

  const fetchContestData = async () => {
    try {
      // Fetch contest
      const { data: contestData, error: contestError } = await supabase
        .from("contests")
        .select("*")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;

      setTitle(contestData.title);
      setDescription(contestData.description || "");
      setDuration(contestData.duration_minutes);
      setIsActive(contestData.is_active);

      // Fetch problems with test cases
      const { data: problemsData, error: problemsError } = await supabase
        .from("problems")
        .select("*")
        .eq("contest_id", contestId)
        .order("order_index", { ascending: true });

      if (problemsError) throw problemsError;

      const problemsWithTestCases: Problem[] = await Promise.all(
        (problemsData || []).map(async (p) => {
          const [sampleRes, hiddenRes] = await Promise.all([
            supabase.from("sample_test_cases").select("*").eq("problem_id", p.id),
            supabase.from("hidden_test_cases").select("*").eq("problem_id", p.id),
          ]);

          return {
            id: p.id,
            title: p.title,
            description: p.description || "",
            score: p.score,
            sample_test_cases: (sampleRes.data || []).map((tc) => ({
              id: tc.id,
              input: tc.input,
              output: tc.expected_output,
            })),
            hidden_test_cases: (hiddenRes.data || []).map((tc) => ({
              id: tc.id,
              input: tc.input,
              expected_output: tc.expected_output,
            })),
            isExpanded: false,
            isNew: false,
          };
        })
      );

      setProblems(problemsWithTestCases);
    } catch (err: any) {
      console.error("Error fetching contest:", err);
      toast({
        title: "Error",
        description: "Failed to load contest data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addProblem = () => {
    const newProblem: Problem = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      score: 100,
      sample_test_cases: [{ input: "", output: "" }],
      hidden_test_cases: [{ input: "", expected_output: "" }],
      isExpanded: true,
      isNew: true,
    };
    setProblems([...problems, newProblem]);
  };

  const updateProblem = (id: string, updates: Partial<Problem>) => {
    setProblems(problems.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeProblem = (id: string, isNew?: boolean) => {
    if (!isNew) {
      setDeletedProblems([...deletedProblems, id]);
    }
    setProblems(problems.filter(p => p.id !== id));
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

  const removeSampleTestCase = (problemId: string, index: number, caseId?: string) => {
    if (caseId) {
      setDeletedSampleCases([...deletedSampleCases, caseId]);
    }
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

  const removeHiddenTestCase = (problemId: string, index: number, caseId?: string) => {
    if (caseId) {
      setDeletedHiddenCases([...deletedHiddenCases, caseId]);
    }
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
      // Update contest
      const { error: contestError } = await supabase
        .from("contests")
        .update({
          title: title.trim(),
          description: description.trim(),
          duration_minutes: duration,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contestId);

      if (contestError) throw contestError;

      // Delete removed items
      if (deletedSampleCases.length > 0) {
        await supabase.from("sample_test_cases").delete().in("id", deletedSampleCases);
      }
      if (deletedHiddenCases.length > 0) {
        await supabase.from("hidden_test_cases").delete().in("id", deletedHiddenCases);
      }
      if (deletedProblems.length > 0) {
        // Delete test cases first (foreign key)
        await supabase.from("sample_test_cases").delete().in("problem_id", deletedProblems);
        await supabase.from("hidden_test_cases").delete().in("problem_id", deletedProblems);
        await supabase.from("problems").delete().in("id", deletedProblems);
      }

      // Update/Create problems
      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        if (!problem.title.trim()) continue;

        let problemId = problem.id;

        if (problem.isNew) {
          // Create new problem
          const { data: createdProblem, error: problemError } = await supabase
            .from("problems")
            .insert({
              contest_id: contestId,
              title: problem.title.trim(),
              description: problem.description.trim(),
              score: problem.score,
              order_index: i,
            })
            .select()
            .single();

          if (problemError) throw problemError;
          problemId = createdProblem.id;
        } else {
          // Update existing problem
          const { error: problemError } = await supabase
            .from("problems")
            .update({
              title: problem.title.trim(),
              description: problem.description.trim(),
              score: problem.score,
              order_index: i,
            })
            .eq("id", problem.id);

          if (problemError) throw problemError;
        }

        // Handle sample test cases
        for (const tc of problem.sample_test_cases) {
          if (tc.input.trim() || tc.output.trim()) {
            if (tc.id) {
              await supabase.from("sample_test_cases").update({
                input: tc.input,
                expected_output: tc.output,
              }).eq("id", tc.id);
            } else {
              await supabase.from("sample_test_cases").insert({
                problem_id: problemId,
                input: tc.input,
                expected_output: tc.output,
              });
            }
          }
        }

        // Handle hidden test cases
        for (const tc of problem.hidden_test_cases) {
          if (tc.input.trim() || tc.expected_output.trim()) {
            if (tc.id) {
              await supabase.from("hidden_test_cases").update({
                input: tc.input,
                expected_output: tc.expected_output,
              }).eq("id", tc.id);
            } else {
              await supabase.from("hidden_test_cases").insert({
                problem_id: problemId,
                input: tc.input,
                expected_output: tc.expected_output,
              });
            }
          }
        }
      }

      // Clear deleted tracking
      setDeletedProblems([]);
      setDeletedSampleCases([]);
      setDeletedHiddenCases([]);

      toast({ title: "Success", description: "Contest updated successfully! Changes are now live." });
      
      // Refresh data
      await fetchContestData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update contest", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading contest...</span>
        </div>
      </div>
    );
  }

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
            <h1 className="text-lg font-semibold">Edit Contest</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={fetchContestData}>
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button variant="arena" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Notice about real-time updates */}
        <ArenaCard className="mb-6 border-primary/30 bg-primary/5">
          <ArenaCardContent className="flex items-center gap-3 py-3">
            <RefreshCw size={18} className="text-primary" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Real-time updates enabled:</span>{" "}
              Changes you save here will instantly reflect on student devices.
            </p>
          </ArenaCardContent>
        </ArenaCard>

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
                  <button
                    onClick={() => updateProblem(problem.id, { isExpanded: !problem.isExpanded })}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <GripVertical size={16} className="text-muted-foreground" />
                    <span className="font-medium">
                      Problem {index + 1}: {problem.title || "Untitled"}
                    </span>
                    <span className="text-sm text-primary">({problem.score} pts)</span>
                    {problem.isNew && (
                      <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">New</span>
                    )}
                    {problem.isExpanded ? (
                      <ChevronUp size={16} className="text-muted-foreground ml-auto" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground ml-auto" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProblem(problem.id, problem.isNew)}
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
                                onClick={() => removeSampleTestCase(problem.id, tcIndex, tc.id)}
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
                            <label className="text-xs text-muted-foreground">Input</label>
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
                                onClick={() => removeHiddenTestCase(problem.id, tcIndex, tc.id)}
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
