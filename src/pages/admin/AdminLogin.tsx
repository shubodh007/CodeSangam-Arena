import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { Shield, Lock, Mail, AlertCircle, ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError || profile?.role !== "admin") {
          await supabase.auth.signOut();
          setError("You do not have admin access.");
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting to admin dashboard...",
        });
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);

    try {
      // Sign up new admin
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (signUpData.user) {
        // Create profile with admin role
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: signUpData.user.id,
            email: email,
            role: "admin",
          });

        if (profileError) {
          console.error("Profile error:", profileError);
        }

        setSetupSuccess(true);
        toast({
          title: "Admin account created!",
          description: "You can now sign in with your credentials.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (setupSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
              <ArrowLeft size={16} />
              Back to Home
            </Button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Admin Account Created!</h1>
            <p className="text-muted-foreground mb-6">
              Your admin account has been set up successfully.
            </p>
            <Button variant="arena" size="lg" onClick={() => { setSetupSuccess(false); setIsSetup(false); }}>
              <Shield size={18} />
              Sign In Now
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm text-muted-foreground">
              <Shield size={14} />
              Admin Portal
            </div>
          </div>

          <ArenaCard glow>
            <ArenaCardHeader>
              <h1 className="text-xl font-semibold text-foreground">
                {isSetup ? "Create Admin Account" : "Admin Login"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isSetup 
                  ? "Set up your first admin account" 
                  : "Sign in to manage contests and problems"}
              </p>
            </ArenaCardHeader>

            <ArenaCardContent>
              <form onSubmit={isSetup ? handleSetup : handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      variant="arena"
                      type="email"
                      placeholder="admin@codearena.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      variant="arena"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                  {isSetup && (
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="arena"
                  size="lg"
                  className="w-full mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : isSetup ? (
                    <>
                      <UserPlus size={18} />
                      Create Admin Account
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-border text-center">
                <button
                  type="button"
                  onClick={() => { setIsSetup(!isSetup); setError(""); }}
                  className="text-sm text-primary hover:underline"
                >
                  {isSetup ? "Already have an account? Sign in" : "First time? Create admin account"}
                </button>
              </div>
            </ArenaCardContent>
          </ArenaCard>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Not an admin?{" "}
            <button
              onClick={() => navigate("/student/entry")}
              className="text-primary hover:underline"
            >
              Enter as Student
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
