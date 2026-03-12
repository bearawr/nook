import { useEffect, useState } from "react";
import { getDb } from "../db";
import { useAppStore } from "../store";
import "../App.css";

interface Book {
  id: number;
  title: string;
  created_at: string;
}

export default function LibraryView() {
  const [books, setBooks] = useState<Book[]>([]);
  const openBook = useAppStore((s) => s.openBook);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    const db = await getDb();
    const result = await db.select<Book[]>("SELECT * FROM books ORDER BY created_at DESC");
    setBooks(result);
  }

  async function addBook() {
    const db = await getDb();
    await db.execute("INSERT INTO books (title) VALUES ('Untitled Book')");
    await loadBooks();
  }

  return (
    <div className="library-view">
      <h1>Nook</h1>
      <button onClick={addBook}>+ Add Book</button>
      <div className="library-book-list">
        {books.map((book) => (
          <button key={book.id} onClick={() => openBook(book.id, book.title)}>
            {book.title}
          </button>
        ))}
        {books.length === 0 && <p className="library-empty">No books yet. Add one above.</p>}
      </div>
    </div>
  );
}
