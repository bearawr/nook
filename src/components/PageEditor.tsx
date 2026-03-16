import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageResize from "tiptap-extension-resize-image";
import { useEffect, useRef, useState } from "react";
import { loadPageContent, savePageContent } from "../db";
import { setActiveEditor } from "../editorRef";

interface Props {
  bookId: number;
  pageNumber: number;
  onUpdate?: (editor: any) => void;
  onOverflow?: () => void;
}

const PAGE_HEIGHT = 600;

export default function PageEditor({ bookId, pageNumber, onUpdate, onOverflow }: Props) {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<string>("");
  const editorRef = useRef<any>(null);
  const contentDivRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

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
    content: "",
    onFocus() {
      if (editorRef.current) setActiveEditor(editorRef.current);
    },
    onUpdate({ editor }) {
      // Always keep ref in sync
      contentRef.current = editor.getHTML();
      editorRef.current = editor;
      setActiveEditor(editor);

      // Check overflow
      if (contentDivRef.current) {
        const prosemirror = contentDivRef.current.querySelector(".ProseMirror") as HTMLElement;
        if (prosemirror) {
          setIsOverflowing(prosemirror.scrollHeight > PAGE_HEIGHT);
        }
      }

      // Debounced save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        await savePageContent(bookId, pageNumber, contentRef.current);
      }, 500);

      onUpdate?.(editor);
    },
  });

  // Keep editorRef in sync
  useEffect(() => {
    if (editor) editorRef.current = editor;
  }, [editor]);

  // Load content on mount or page change
  useEffect(() => {
    if (!editor) return;
    loadPageContent(bookId, pageNumber).then((content) => {
      const html = content || "<p></p>";
      editor.commands.setContent(html);
      contentRef.current = html;
    });
  }, [bookId, pageNumber, editor]);

  // Save on unmount using ref — synchronous reference, async write
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      // Fire and forget — content is always up to date in contentRef
      savePageContent(bookId, pageNumber, contentRef.current);
    };
  }, [bookId, pageNumber]);

  return (
    <div ref={contentDivRef}>
      <div style={{ height: `${PAGE_HEIGHT}px`, overflowY: "auto" }}>
        <EditorContent editor={editor} />
      </div>
      {isOverflowing && onOverflow && (
        <div style={{ borderTop: "1px dashed #ccc", paddingTop: "8px", marginTop: "4px", textAlign: "right" }}>
          <button
            onClick={onOverflow}
            style={{ fontSize: "12px", color: "#888", background: "none", border: "none", cursor: "pointer" }}
          >
            Continue on next page →
          </button>
        </div>
      )}
    </div>
  );
}

