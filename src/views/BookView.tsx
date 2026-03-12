import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useAppStore } from "../store";
import { useEffect, useState } from "react";

export default function BookView() {
    const goHome = useAppStore((s) => s.goHome);
    const currentPage = useAppStore((s) => s.currentPage);
    const totalPages = useAppStore((s) => s.totalPages);
    const nextPage = useAppStore((s) => s.nextPage);
    const prevPage = useAppStore((s) => s.prevPage);
    const goToPage = useAppStore((s) => s.goToPage);
    const bookTitle = useAppStore((s) => s.currentBookTitle);

    const [jumpInput, setJumpInput] = useState("");

    const isCoverPage = currentPage === 1;

    // Left page number when in spread view (page 2 onwards)
    // page 2 shows pages 2+3, page 4 shows pages 4+5, etc
    const leftPageNum = currentPage;
    const rightPageNum = currentPage + 1;

    const editor = useEditor({
        extensions: [StarterKit],
        content: "<p>Start writing...</p>",
    });

    // Arrow key navigation
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Don't flip pages if user is typing in the editor
            if ((e.target as HTMLElement).closest(".ProseMirror")) return;
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

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

            {/* Top Bar */}
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #ccc", display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={goHome}>← Home</button>
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

            {/* Pages Area */}
            <div style={{ flex: 1, overflow: "auto", background: "#e0e0e0", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px", gap: "24px" }}>

                {/* COVER PAGE — single right page */}
                {isCoverPage && (
                    <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                        <h1 style={{ fontSize: "32px", textAlign: "center" }}>{bookTitle}</h1>
                        <p style={{ color: "#aaa", marginTop: "16px" }}>Page 1</p>
                    </div>
                )}

                {/* SPREAD VIEW — two pages side by side */}
                {!isCoverPage && (
                    <>
                    {/* Left Page */}
                    <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative" }}>
                        <div style={{ position: "absolute", top: "16px", right: "24px", color: "#aaa", fontSize: "13px" }}>{leftPageNum}</div>
                        <EditorContent editor={editor} />
                    </div>

                    {/* Right Page */}
                    <div style={{ width: "500px", minHeight: "700px", background: "white", padding: "60px 48px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative" }}>
                        <div style={{ position: "absolute", top: "16px", right: "24px", color: "#aaa", fontSize: "13px" }}>{rightPageNum}</div>
                            <p style={{ color: "#aaa" }}>Next page...</p>
                    </div>
                    </>
                )}

            </div>
        </div>
    );
}
