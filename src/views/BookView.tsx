import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { useAppStore } from "../store";
import { useEffect, useState } from "react";
import React from "react";

interface TocEntry {
  id: string;
  level: number;
  text: string;
}

export default function BookView() {
  const goHome = useAppStore((s) => s.goHome);
  const currentPage = useAppStore((s) => s.currentPage);
  const totalPages = useAppStore((s) => s.totalPages);
  const nextPage = useAppStore((s) => s.nextPage);
  const prevPage = useAppStore((s) => s.prevPage);
  const goToPage = useAppStore((s) => s.goToPage);
  const bookTitle = useAppStore((s) => s.currentBookTitle);
  const tocOpen = useAppStore((s) => s.tocOpen);
  const toggleToc = useAppStore((s) => s.toggleToc);

  const [jumpInput, setJumpInput] = useState("");
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  const isCoverPage = currentPage === 1;
  const leftPageNum = currentPage;
  const rightPageNum = currentPage + 1;

  const editor = useEditor({
    extensions: [StarterKit, Typography],
    content: "<p>Start writing...</p>",
    onUpdate({ editor }) {
      buildToc(editor);
    },
  });

  function buildToc(ed: any) {
    const headings: TocEntry[] = [];
    ed.state.doc.forEach((node: any) => {
      if (node.type.name === "heading") {
        const text = node.textContent;
        const level = node.attrs.level;
        const id = `heading-${text}-${level}`.replace(/\s+/g, "-").toLowerCase();
        headings.push({ id, level, text });
      }
    });
    setTocEntries(headings);
  }

  function scrollToHeading(text: string) {
    // Find the heading in the editor DOM and scroll to it
    const editorEl = document.querySelector(".ProseMirror");
    if (!editorEl) return;
    const headings = editorEl.querySelectorAll("h1, h2, h3");
    for (const el of Array.from(headings)) {
      if (el.textContent === text) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  }

  function toggleExpand(id: string) {
    setExpandedChapters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  // Arrow key navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest(".ProseMirror")) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage]);

  function handleJump(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const num = parseInt(jumpInput);
      if (!isNaN(num)) goToPage(num);
      setJumpInput("");
    }
  }

  // Render TOC — H1s are chapters, H2/H3 are nested under their parent H1
  function renderToc() {
    const items: React.JSX.Element[] = [];
    let currentChapterId: string | null = null;

    for (const entry of tocEntries) {
      if (entry.level === 1) {
        currentChapterId = entry.id;
        const isExpanded = expandedChapters.includes(entry.id);
        items.push(
          <div key={entry.id} style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => scrollToHeading(entry.text)}
                style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: "14px", fontWeight: "bold" }}
              >
                {entry.text}
              </button>
              <button
                onClick={() => toggleExpand(entry.id)}
                style={{ fontSize: "10px", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}
              >
                {isExpanded ? "▲" : "▼"}
              </button>
            </div>
          </div>
        );
      } else if ((entry.level === 2 || entry.level === 3) && currentChapterId) {
        if (expandedChapters.includes(currentChapterId)) {
          items.push(
            <div
              key={entry.id}
              style={{ paddingLeft: entry.level === 2 ? "16px" : "28px", marginBottom: "4px" }}
            >
              <button
                onClick={() => scrollToHeading(entry.text)}
                style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", fontSize: entry.level === 2 ? "13px" : "12px", color: "#555" }}
              >
                {entry.text}
              </button>
            </div>
          );
        }
      }
    }

    return items.length > 0 ? items : <p style={{ color: "#aaa", fontSize: "13px" }}>Type # to create a chapter.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* Top Bar */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #ccc", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={goHome}>← Home</button>
        <button onClick={toggleToc}>🔖 TOC</button>
        <span style={{ fontWeight: "bold" }}>{bookTitle}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={prevPage} disabled={currentPage === 1}>←</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages}>→</button>
          <input
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={handleJump}
            placeholder="Go to page..."
            style={{ width: "100px", padding: "4px 8px" }}
          />
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* TOC Panel */}
        {tocOpen && (
          <div style={{ width: "240px", borderRight: "1px solid #ccc", padding: "16px", overflowY: "auto", background: "#fafafa" }}>
            <strong style={{ display: "block", marginBottom: "12px" }}>Table of Contents</strong>
            {renderToc()}
          </div>
        )}

        {/* Pages Area */}
        <div style={{ flex: 1, overflow: "auto", background: "#e0e0e0", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px", gap: "24px" }}>

          {/* Cover Page */}
          {isCoverPage && (
            <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <h1 style={{ fontSize: "32px", textAlign: "center" }}>{bookTitle}</h1>
              <p style={{ color: "#aaa", marginTop: "16px" }}>Page 1</p>
            </div>
          )}

          {/* Spread View */}
          {!isCoverPage && (
            <>
              <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", top: "16px", right: "24px", color: "#aaa", fontSize: "13px" }}>{leftPageNum}</div>
                <EditorContent editor={editor} />
              </div>
              <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", top: "16px", right: "24px", color: "#aaa", fontSize: "13px" }}>{rightPageNum}</div>
                <p style={{ color: "#aaa" }}>Next page...</p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
