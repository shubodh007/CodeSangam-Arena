import { create } from "zustand";
import { persist } from "zustand/middleware";

interface KeyboardState {
  isModalOpen: boolean;
  lastPressedKeys: string[];
  enabledShortcuts: Record<string, boolean>;

  setModalOpen: (open: boolean) => void;
  recordKeyPress: (key: string) => void;
  toggleShortcut: (shortcutId: string, enabled: boolean) => void;
  clearKeyHistory: () => void;
}

export const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set, get) => ({
      isModalOpen: false,
      lastPressedKeys: [],
      enabledShortcuts: {},

      setModalOpen: (open) => set({ isModalOpen: open }),

      recordKeyPress: (key) => {
        const history = get().lastPressedKeys;
        set({ lastPressedKeys: [key, ...history.slice(0, 4)] });
      },

      toggleShortcut: (shortcutId, enabled) => {
        set((state) => ({
          enabledShortcuts: { ...state.enabledShortcuts, [shortcutId]: enabled },
        }));
      },

      clearKeyHistory: () => set({ lastPressedKeys: [] }),
    }),
    {
      name: "keyboard-shortcuts",
      partialize: (state) => ({ enabledShortcuts: state.enabledShortcuts }),
    }
  )
);
