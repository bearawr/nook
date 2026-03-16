import type { Editor } from "@tiptap/react";

let activeEditor: Editor | null = null;

export function setActiveEditor(editor: Editor | null) {
    activeEditor = editor;
}

export function getActiveEditor(): Editor | null {
    return activeEditor;
}