import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useAppStore } from "../store";

export default function BookView() {
    const goHome = useAppStore((s) => s.goHome);

    const editor = useEditor({
        extensions: [StarterKit],
        content: "<p>Start writing...</p>",
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            
            {/* Top Bar */}
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #ccc", display: "flex", gap: "8px" }}>
                <button onClick={goHome}>← Home</button>
            </div>

            {/* Pages Area */}
            <div style={{ flex: 1, overflow: "auto", background: "#e0e0e0", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px", gap: "24px" }}>
            
                {/* Left Page */}
                <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                    <EditorContent editor={editor} />
                </div>

                {/* Right Page */}
                <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                    <p style={{ color: "#aaa" }}>Next page...</p>
                </div>

            </div>
        </div>
    );
}
