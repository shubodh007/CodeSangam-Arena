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
import { AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddWarningDialogProps {
  sessionId: string;
  username: string;
  currentWarnings: number;
  isDisqualified: boolean;
  onWarningAdded: () => void;
}

const WARNING_LIMIT = 15;

export function AddWarningDialog({
  sessionId,
  username,
  currentWarnings,
  isDisqualified,
  onWarningAdded,
}: AddWarningDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const willDisqualify = currentWarnings + 1 >= WARNING_LIMIT;

  const handleAddWarning = async () => {
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
          action: "increment",
          reason: reason || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to add warning");
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Failed to add warning");
      }

      if (data.is_disqualified) {
        toast({
          title: "Student Disqualified",
          description: `${username} has been disqualified (${data.warnings} warnings).`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Warning Added",
          description: `${username} now has ${data.warnings}/${WARNING_LIMIT} warnings.`,
        });
      }

      setOpen(false);
      setReason("");
      onWarningAdded();
    } catch (err: any) {
      console.error("Failed to add warning:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add warning",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDisqualified}
          className="h-8 px-2 text-warning hover:text-warning hover:bg-warning/10"
          title={isDisqualified ? "Already disqualified" : "Add warning"}
        >
          <Plus size={14} />
          <AlertTriangle size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-warning" size={20} />
            Add Warning to {username}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Current warnings: <strong>{currentWarnings}/{WARNING_LIMIT}</strong>
              </p>
              {willDisqualify && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  <strong>⚠️ Warning:</strong> This will disqualify the student!
                  They will be removed from the leaderboard.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Tab switching detected"
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
              handleAddWarning();
            }}
            disabled={loading}
            className={willDisqualify ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : willDisqualify ? (
              "Add Warning & Disqualify"
            ) : (
              "Add Warning"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
