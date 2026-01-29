import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResetWarningsDialogProps {
  sessionId: string;
  username: string;
  currentWarnings: number;
  isDisqualified: boolean;
  onWarningsReset: () => void;
}

export function ResetWarningsDialog({
  sessionId,
  username,
  currentWarnings,
  isDisqualified,
  onWarningsReset,
}: ResetWarningsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetWarnings = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "You must be logged in as admin",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("admin-warnings", {
        body: {
          session_id: sessionId,
          action: "reset",
          reason: reason || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to reset warnings");
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Failed to reset warnings");
      }

      toast({
        title: "Warnings Reset",
        description: `${username}'s warnings have been reset to 0.`,
      });

      setOpen(false);
      setReason("");
      onWarningsReset();
    } catch (err: any) {
      console.error("Failed to reset warnings:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to reset warnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show if there are warnings or student is disqualified
  if (currentWarnings === 0 && !isDisqualified) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-success hover:text-success hover:bg-success/10"
          title="Reset warnings"
        >
          <RotateCcw size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="text-success" size={20} />
            Reset Warnings for {username}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Current warnings: <strong>{currentWarnings}</strong>
                {isDisqualified && (
                  <span className="ml-2 text-destructive">(Disqualified)</span>
                )}
              </p>
              {isDisqualified && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success">
                  <strong>Note:</strong> This will reinstate the student to the contest
                  and they will reappear on the leaderboard.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-reason">Reason (optional)</Label>
                <Input
                  id="reset-reason"
                  placeholder="e.g., False positive detection"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleResetWarnings();
            }}
            disabled={loading}
            className="bg-success hover:bg-success/90"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Reset Warnings"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
