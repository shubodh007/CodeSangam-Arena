import { useNavigate, useLocation } from "react-router-dom";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useKeyboardStore } from "@/store/keyboardStore";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { KeyPressIndicator } from "@/components/KeyPressIndicator";

interface GlobalKeyboardShortcutsProps {
  children: React.ReactNode;
}

export function GlobalKeyboardShortcuts({ children }: GlobalKeyboardShortcutsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setModalOpen, isModalOpen } = useKeyboardStore();

  useKeyboardShortcuts(
    [
      {
        key: "?",
        description: "Show keyboard shortcuts",
        action: () => setModalOpen(true),
      },
      {
        key: "ctrl+/",
        description: "Show keyboard shortcuts (alternate)",
        action: () => setModalOpen(true),
      },
      {
        key: "esc",
        description: "Close modal",
        action: () => {
          if (isModalOpen) setModalOpen(false);
        },
      },
      {
        key: "ctrl+l",
        description: "Go to leaderboard",
        action: () => {
          const match = location.pathname.match(/\/contest\/([^/]+)/);
          if (match?.[1]) navigate(`/contest/${match[1]}/leaderboard`);
        },
      },
      {
        key: "ctrl+p",
        description: "Go to problem list",
        action: () => {
          const match = location.pathname.match(/\/contest\/([^/]+)/);
          if (match?.[1]) navigate(`/contest/${match[1]}`);
        },
      },
    ],
    { context: "outside-monaco", preventDefault: true }
  );

  return (
    <>
      {children}
      <KeyboardShortcutsModal />
      <KeyPressIndicator />
    </>
  );
}
