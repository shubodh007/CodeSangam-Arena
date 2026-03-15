import { supabase } from "@/integrations/supabase/client";

export type ViolationType =
  | "fullscreen_exit"
  | "tab_switch"
  | "application_switch"
  | "extended_absence"
  | "mouse_left_bounds"
  | "forbidden_key"
  | "screenshot_attempt"
  | "virtual_desktop_switch"
  | "right_click"
  | "devtools_open"
  | "copy_paste"
  | "page_reload"
  | "window_resize";

const VIOLATION_MESSAGES: Record<ViolationType, string> = {
  fullscreen_exit: "You exited fullscreen mode",
  tab_switch: "You switched browser tabs",
  application_switch: "Application switch detected (Alt+Tab or Windows key)",
  extended_absence: "You were away from the contest for an extended period",
  mouse_left_bounds: "Mouse moved outside browser window",
  forbidden_key: "Windows/Meta key press detected",
  screenshot_attempt: "Screenshot attempt detected",
  virtual_desktop_switch: "Virtual desktop switch attempt detected",
  right_click: "Right-click is disabled during contests",
  devtools_open: "Developer tools were detected",
  copy_paste: "Copy/paste is restricted during contests",
  page_reload: "Page reload attempt detected",
  window_resize: "Window resize detected (possible split-screen)",
};

export const getViolationMessage = (type: ViolationType): string =>
  VIOLATION_MESSAGES[type] ?? "Anti-cheat violation detected";

interface StandaloneReportParams {
  sessionId: string;
  type: ViolationType;
}

/**
 * Standalone violation reporter — use when you cannot access the
 * `reportViolation` callback from `useAntiCheat`.
 * Sends directly to the report-violation edge function.
 */
export const reportViolationStandalone = async ({
  sessionId,
  type,
}: StandaloneReportParams): Promise<void> => {
  try {
    const reason = getViolationMessage(type);
    await supabase.functions.invoke("report-violation", {
      body: { session_id: sessionId, reason },
    });
  } catch {
    // Fail silently — violation reporting must never disrupt the contest
  }
};
