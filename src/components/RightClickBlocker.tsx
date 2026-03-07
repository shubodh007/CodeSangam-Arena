import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export function RightClickBlocker() {
  const [open, setOpen] = useState(false);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [handleContextMenu]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
              <ShieldAlert size={20} className="text-warning" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Action Blocked</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Right-click is disabled for this page.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
