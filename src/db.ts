import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:nook.db");
  await initSchema(db);
  return db;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Untitled Book',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Chapter',
      order_index INTEGER NOT NULL DEFAULT 0,
      start_page INTEGER NOT NULL DEFAULT 2,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      content TEXT DEFAULT '',
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      page_id INTEGER NOT NULL,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `);
}

export async function getOrCreatePage(bookId: number, pageNumber: number): Promise<number> {
    const db = await getDb();
  
    // Try to find existing page
    const existing = await db.select<{ id: number }[]>(
      "SELECT id FROM pages WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?) AND order_index = ?",
      [bookId, pageNumber]
    );
  
    if (existing.length > 0) return existing[0].id;
  
    // Ensure a default chapter exists
    let chapterResult = await db.select<{ id: number }[]>(
      "SELECT id FROM chapters WHERE book_id = ? ORDER BY order_index ASC LIMIT 1",
      [bookId]
    );
  
    let chapterId: number;
    if (chapterResult.length === 0) {
      await db.execute(
        "INSERT INTO chapters (book_id, title, order_index, start_page) VALUES (?, 'Chapter 1', 0, 2)",
        [bookId]
      );
      chapterResult = await db.select<{ id: number }[]>(
        "SELECT id FROM chapters WHERE book_id = ? ORDER BY order_index ASC LIMIT 1",
        [bookId]
      );
    }
    chapterId = chapterResult[0].id;
  
    // Create the page
    await db.execute(
      "INSERT INTO pages (chapter_id, order_index, content) VALUES (?, ?, ?)",
      [chapterId, pageNumber, ""]
    );
  
    const newPage = await db.select<{ id: number }[]>(
      "SELECT id FROM pages WHERE chapter_id = ? AND order_index = ?",
      [chapterId, pageNumber]
    );
  
    return newPage[0].id;
  }
  
  export async function loadPageContent(bookId: number, pageNumber: number): Promise<string> {
    const db = await getDb();
    const result = await db.select<{ content: string }[]>(
      "SELECT content FROM pages WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?) AND order_index = ?",
      [bookId, pageNumber]
    );
    return result.length > 0 ? result[0].content : "";
  }
  
  export async function savePageContent(bookId: number, pageNumber: number, content: string): Promise<void> {
    const db = await getDb();
    await getOrCreatePage(bookId, pageNumber);
    await db.execute(
      "UPDATE pages SET content = ? WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?) AND order_index = ?",
      [content, bookId, pageNumber]
    );
  }
  