import { create } from "zustand";

export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  order_index: number;
  start_page: number;
}

interface AppState {
  currentView: "library" | "book";
  currentBookId: number | null;
  currentBookTitle: string;
  currentPage: number;
  totalPages: number;
  chapters: Chapter[];
  tocOpen: boolean;
  setView: (view: "library" | "book") => void;
  openBook: (id: number, title: string) => void;
  goHome: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setTotalPages: (total: number) => void;
  setChapters: (chapters: Chapter[]) => void;
  toggleToc: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: "library",
  currentBookId: null,
  currentBookTitle: "",
  currentPage: 1,
  totalPages: 3,
  chapters: [],
  tocOpen: false,

  setView: (view) => set({ currentView: view }),
  openBook: (id, title) => set({
    currentView: "book",
    currentBookId: id,
    currentBookTitle: title,
    currentPage: 1,
    chapters: [],
    tocOpen: false,
  }),
  goHome: () => set({ currentView: "library", currentBookId: null, currentPage: 1 }),
  goToPage: (page) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) set({ currentPage: page });
  },
  nextPage: () => {
    const { currentPage, totalPages } = get();
    // Cover (1) → first spread (2), then jump by 2
    const next = currentPage === 1 ? 2 : currentPage + 2;
    if (next <= totalPages) {
      set({ currentPage: next });
    } else {
      // Create a new spread
      set({ currentPage: next, totalPages: next + 1 });
    }
  },
  prevPage: () => {
    const { currentPage } = get();
    if (currentPage === 2) set({ currentPage: 1 });
    else if (currentPage > 2) set({ currentPage: currentPage - 2 });
  },
  setTotalPages: (total) => set({ totalPages: total }),
  setChapters: (chapters) => set({ chapters }),
  toggleToc: () => set((s) => ({ tocOpen: !s.tocOpen })),
}));