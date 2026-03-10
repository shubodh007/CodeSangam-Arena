import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader, ArenaCardFooter } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  LogOut,
  Trophy,
  FileText,
  Clock,
  Users,
  BarChart3,
  Pencil,
  Power,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contest {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/admin/login");
      return;
    }

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

    fetchContests();
  };

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (err) {
      console.error("Error fetching contests:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleContestStatus = async (contestId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("contests")
        .update({ is_active: !currentStatus })
        .eq("id", contestId);

      if (error) throw error;

      setContests(contests.map(c => 
        c.id === contestId ? { ...c, is_active: !currentStatus } : c
      ));

      toast({
        title: !currentStatus ? "Contest Activated" : "Contest Deactivated",
        description: !currentStatus 
          ? "Students can now join this contest" 
          : "Contest is now hidden from students",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update contest status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { label: "Total Contests", value: contests.length, icon: Trophy, color: "bg-primary/10 text-primary" },
    { label: "Active Contests", value: contests.filter(c => c.is_active).length, icon: Power, color: "bg-success/10 text-success" },
    { label: "Total Problems", value: "—", icon: FileText, color: "bg-accent/10 text-accent" },
    { label: "Active Students", value: "—", icon: Users, color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border header-glass sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Button
              variant="arena"
              onClick={() => navigate("/admin/contest/new")}
            >
              <Plus size={16} />
              Create Contest
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <ArenaCard key={stat.label} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` } as React.CSSProperties}>
              <ArenaCardContent className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color.split(" ")[0]}`}>
                  <stat.icon size={24} className={stat.color.split(" ")[1]} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </ArenaCardContent>
            </ArenaCard>
          ))}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">All Contests</h2>
        </div>

        {/* Contest List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <ArenaCard key={i}>
                <ArenaCardContent className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                </ArenaCardContent>
              </ArenaCard>
            ))}
          </div>
        ) : contests.length === 0 ? (
          <ArenaCard>
            <ArenaCardContent className="py-16 text-center">
              <Trophy size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Contests Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first contest to get started
              </p>
              <Button variant="arena" onClick={() => navigate("/admin/contest/new")}>
                <Plus size={16} />
                Create Contest
              </Button>
            </ArenaCardContent>
          </ArenaCard>
        ) : (
          <div className="grid gap-4">
            {contests.map((contest, i) => (
              <ArenaCard
                key={contest.id}
                hover
                className="animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
              >
                <ArenaCardContent className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {contest.title}
                      </h3>
                      <StatusBadge 
                        status={contest.is_active ? "active" : "inactive"} 
                        size="sm"
                        pulse={contest.is_active}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {contest.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {contest.duration_minutes} min
                      </span>
                      <span>
                        Created {new Date(contest.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/admin/contest/${contest.id}`)}
                      title="View & Edit"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/admin/contest/${contest.id}/leaderboard`)}
                      title="Leaderboard"
                    >
                      <BarChart3 size={16} />
                    </Button>
                    <Button
                      variant={contest.is_active ? "outline" : "arena"}
                      size="sm"
                      onClick={() => toggleContestStatus(contest.id, contest.is_active)}
                    >
                      <Power size={14} />
                      {contest.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </ArenaCardContent>
              </ArenaCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
