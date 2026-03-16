import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageResize from "tiptap-extension-resize-image";
import { useEffect, useRef } from "react";
import {
  loadBlocks,
  saveBlocks,
  getOrCreatePage,
  tipTapToBlocks,
  blocksToTipTap,
  Block,
} from "../db";
import { setActiveEditor } from "../editorRef";

interface Props {
  bookId: number;
  pageNumber: number;
  onUpdate?: (editor: any) => void;
  onOverflow?: (overflowBlocks: Omit<Block, "id" | "page_id">[]) => Promise<void>;
}

const PAGE_HEIGHT = 600;

export default function PageEditor({ bookId, pageNumber, onUpdate, onOverflow }: Props) {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageIdRef = useRef<number | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const isCheckingOverflowRef = useRef(false);
  const saveVersionRef = useRef(0);

  const onOverflowRef = useRef(onOverflow);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onOverflowRef.current = onOverflow; }, [onOverflow]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

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
    content: { type: "doc", content: [{ type: "paragraph" }] },
    onFocus({ editor }) {
      setActiveEditor(editor);
    },
    onUpdate({ editor }) {
      if (isLoadingRef.current || isCheckingOverflowRef.current) return;

      setActiveEditor(editor);
      onUpdateRef.current?.(editor);

      // Versioned debounced save
      const version = ++saveVersionRef.current;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        if (!pageIdRef.current) return;
        if (saveVersionRef.current !== version) return;
        const blocks = tipTapToBlocks(editor.state.doc.toJSON());
        await saveBlocks(pageIdRef.current, blocks as Block[]);
      }, 400);

      // Check overflow after paint
      requestAnimationFrame(() => {
        if (isCheckingOverflowRef.current) return;
        checkOverflow(editor);
      });
    },
  });

  async function checkOverflow(ed: any) {
    if (!editorContainerRef.current) return;
    if (!onOverflowRef.current) return;
    if (!pageIdRef.current) return;

    const proseMirror = editorContainerRef.current.querySelector(".ProseMirror") as HTMLElement;
    if (!proseMirror) return;

    console.log(`[Page ${pageNumber}] scrollHeight=${proseMirror.scrollHeight} PAGE_HEIGHT=${PAGE_HEIGHT}`);

    if (proseMirror.scrollHeight <= PAGE_HEIGHT) return;

    console.log(`[Page ${pageNumber}] OVERFLOW DETECTED`);

    // Invalidate pending saves
    saveVersionRef.current++;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    isCheckingOverflowRef.current = true;

    const doc = ed.state.doc;
    const blockEls = Array.from(proseMirror.children) as HTMLElement[];
    const keepBlocks: Omit<Block, "id" | "page_id">[] = [];
    const overflowBlocks: Omit<Block, "id" | "page_id">[] = [];

    let accumulatedHeight = 0;
    let overflowStarted = false;

    doc.content.forEach((node: any, _offset: number, index: number) => {
      const el = blockEls[index];
      const blockHeight = el ? el.offsetHeight + 8 : 40;

      console.log(`[Page ${pageNumber}] Block ${index}: height=${blockHeight} accumulated=${accumulatedHeight} overflow=${overflowStarted}`);

      const blockData = {
        type: "paragraph" as any,
        content: JSON.stringify(node.toJSON()),
        order_index: index,
      };

      if (!overflowStarted && accumulatedHeight + blockHeight > PAGE_HEIGHT) {
        overflowStarted = true;
      }

      if (overflowStarted) {
        overflowBlocks.push(blockData);
      } else {
        accumulatedHeight += blockHeight;
        keepBlocks.push(blockData);
      }
    });

    console.log(`[Page ${pageNumber}] keep=${keepBlocks.length} overflow=${overflowBlocks.length}`);

    if (overflowBlocks.length === 0) {
      isCheckingOverflowRef.current = false;
      return;
    }

    // Rebuild page with only kept blocks
    const keepContent = blocksToTipTap(
      keepBlocks.map((b, i) => ({ ...b, id: i, page_id: pageIdRef.current! }))
    );

    isLoadingRef.current = true;
    ed.commands.setContent(keepContent);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isLoadingRef.current = false;
        isCheckingOverflowRef.current = false;
      });
    });

    // Save kept blocks
    saveBlocks(pageIdRef.current, keepBlocks as Block[]);

    // Send overflow to next page
    console.log(`[Page ${pageNumber}] Sending ${overflowBlocks.length} blocks to next page`);
    await onOverflowRef.current(overflowBlocks);
  }

  // Load content
  useEffect(() => {
    if (!editor) return;
    async function load() {
        isLoadingRef.current = true;
        const pageId = await getOrCreatePage(bookId, pageNumber);
        pageIdRef.current = pageId;
        console.log(`[PageEditor load] pageNumber=${pageNumber} pageId=${pageId}`);
        const blocks = await loadBlocks(pageId);
        console.log(`[PageEditor load] loaded ${blocks.length} blocks for page ${pageNumber}`);
        const content = blocksToTipTap(blocks);
        editor!.commands.setContent(content);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isLoadingRef.current = false;
          });
        });
      }
    load();
  }, [bookId, pageNumber, editor]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (editor && pageIdRef.current) {
        const blocks = tipTapToBlocks(editor.state.doc.toJSON());
        saveBlocks(pageIdRef.current, blocks as Block[]);
      }
    };
  }, [editor]);

  return (
    <div ref={editorContainerRef} style={{ height: `${PAGE_HEIGHT}px`, overflow: "hidden" }}>
      <EditorContent editor={editor} />
    </div>
  );
}

