import { create } from "zustand";

interface AppState {
    currentView: "library" | "book";
    currentBookId: number | null;
    currentBookTitle: string;
    currentPage: number;
    totalPages: number;
    setView: (view: "library" | "book") => void;
    openBook: (id: number, title: string) => void;
    goHome: () => void;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    setTotalPages: (total: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    currentView: "library",
    currentBookId: null,
    currentBookTitle: "",
    currentPage: 1,
    totalPages: 6,

    setView: (view) => set({ currentView: view }),
    openBook: (id, title) => set({ currentView: "book", currentBookId: id, currentBookTitle: title, currentPage: 1 }),
    goHome: () => set({ currentView: "library", currentBookId: null, currentPage: 1 }),
    goToPage: (page) => {
        const { totalPages } = get();
        if (page >= 1 && page <= totalPages) set({ currentPage: page });
    },
    nextPage: () => {
        const { currentPage, totalPages } = get();
        if (currentPage < totalPages) set({ currentPage: currentPage + 1 });
    },
    prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 1) set({ currentPage: currentPage - 1 });
    },
    setTotalPages: (total) => set({ totalPages: total }),
}));
