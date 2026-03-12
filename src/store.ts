import { create } from "zustand";

interface AppState {
    currentView: "library" | "book";
    currentBookId: number | null;
    setView: (view: "library" | "book") => void;
    openBook: (id: number) => void;
    goHome: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    currentView: "library",
    currentBookId: null,
    setView: (view) => set({ currentView: view }),
    openBook: (id) => set({ currentView: "book", currentBookId: id }),
    goHome: () => set({ currentView: "library", currentBookId: null }),
}));
