import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageResize from "tiptap-extension-resize-image";
import { useAppStore } from "../store";
import { getDb } from "../db";
import "../App.css";

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
  const currentBookId = useAppStore((s) => s.currentBookId);
  const tocOpen = useAppStore((s) => s.tocOpen);
  const toggleToc = useAppStore((s) => s.toggleToc);

  const [jumpInput, setJumpInput] = useState("");
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  const isCoverPage = currentPage === 1;
  const leftPageNum = currentPage;
  const rightPageNum = currentPage + 1;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      (TiptapTable as any).configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ImageResize,
    ],
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

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        (editor?.chain().focus() as any).setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

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

  function renderToc() {
    const items: React.JSX.Element[] = [];
    let currentChapterId: string | null = null;

    for (const entry of tocEntries) {
      if (entry.level === 1) {
        currentChapterId = entry.id;
        const isExpanded = expandedChapters.includes(entry.id);
        items.push(
          <div key={entry.id} className="toc-chapter">
            <div className="toc-chapter-row">
              <button className="toc-chapter-btn" onClick={() => scrollToHeading(entry.text)}>
                {entry.text}
              </button>
              <button className="toc-expand-btn" onClick={() => toggleExpand(entry.id)}>
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
              className="toc-subheading"
              style={{ paddingLeft: entry.level === 2 ? "16px" : "28px" }}
            >
              <button
                className="toc-subheading-btn"
                style={{ fontSize: entry.level === 2 ? "13px" : "12px" }}
                onClick={() => scrollToHeading(entry.text)}
              >
                {entry.text}
              </button>
            </div>
          );
        }
      }
    }

    return items.length > 0
      ? items
      : <p className="toc-empty">Type # to create a chapter.</p>;
  }

  return (
    <div className="book-view">

      {/* Top Bar */}
      <div className="book-topbar">
        <button onClick={goHome}>← Home</button>
        <button onClick={toggleToc}>🔖 TOC</button>
        <span className="book-topbar-title">{bookTitle}</span>
        <div className="book-topbar-nav">
          <button onClick={prevPage} disabled={currentPage === 1}>←</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages}>→</button>
          <input
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={handleJump}
            placeholder="Go to page..."
          />
        </div>
      </div>

      {/* Main Area */}
      <div className="book-main">

        {/* TOC Panel */}
        {tocOpen && (
          <div className="toc-panel">
            <strong>Table of Contents</strong>
            {renderToc()}
          </div>
        )}

        {/* Pages Area */}
        <div className="pages-area">

          {/* Cover Page */}
          {isCoverPage && (
            <div className="cover-page">
              <h1
                contentEditable
                suppressContentEditableWarning
                className="cover-title"
                onBlur={async (e) => {
                  if (!currentBookId) return;
                  const newTitle = e.currentTarget.textContent || "Untitled Book";
                  const db = await getDb();
                  await db.execute("UPDATE books SET title = ? WHERE id = ?", [newTitle, currentBookId]);
                  useAppStore.getState().openBook(currentBookId, newTitle);
                }}
              >
                {bookTitle}
              </h1>
              <p className="cover-hint">Click title to edit</p>
            </div>
          )}

          {/* Spread View */}
          {!isCoverPage && (
            <>
              <div className="spread-page">
                <span className="page-number">{leftPageNum}</span>
                <EditorContent editor={editor} />
              </div>
              <div className="spread-page">
                <span className="page-number">{rightPageNum}</span>
                <p className="page-placeholder">Next page...</p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
