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
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'paragraph',
      content TEXT NOT NULL DEFAULT '{}',
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
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
      block_id INTEGER NOT NULL,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
    );
  `);
}

// ── Block types ────────────────────────────────────────
export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "image"
  | "table";

export interface Block {
  id: number;
  page_id: number;
  type: BlockType;
  content: string; // JSON string of TipTap node content
  order_index: number;
}

// ── Page functions ─────────────────────────────────────
export async function getOrCreatePage(bookId: number, pageNumber: number): Promise<number> {
  const db = await getDb();

  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM pages WHERE book_id = ? AND order_index = ?",
    [bookId, pageNumber]
  );

  if (existing.length > 0) return existing[0].id;

  await db.execute(
    "INSERT INTO pages (book_id, order_index) VALUES (?, ?)",
    [bookId, pageNumber]
  );

  const created = await db.select<{ id: number }[]>(
    "SELECT id FROM pages WHERE book_id = ? AND order_index = ?",
    [bookId, pageNumber]
  );

  return created[0].id;
}

export async function getPageId(bookId: number, pageNumber: number): Promise<number | null> {
  const db = await getDb();
  const result = await db.select<{ id: number }[]>(
    "SELECT id FROM pages WHERE book_id = ? AND order_index = ?",
    [bookId, pageNumber]
  );
  return result.length > 0 ? result[0].id : null;
}

// ── Block functions ────────────────────────────────────
export async function loadBlocks(pageId: number): Promise<Block[]> {
  const db = await getDb();
  const blocks = await db.select<Block[]>(
    "SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index ASC",
    [pageId]
  );
  return blocks;
}

export async function saveBlocks(pageId: number, blocks: Block[]): Promise<void> {
  const db = await getDb();

  // Delete existing blocks for this page
  await db.execute("DELETE FROM blocks WHERE page_id = ?", [pageId]);

  // Re-insert all blocks with updated order
  for (let i = 0; i < blocks.length; i++) {
    await db.execute(
      "INSERT INTO blocks (page_id, type, content, order_index) VALUES (?, ?, ?, ?)",
      [pageId, blocks[i].type, blocks[i].content, i]
    );
  }
}

export async function appendBlocks(pageId: number, blocks: Omit<Block, "id" | "page_id">[]): Promise<void> {
  const db = await getDb();

  // Get current max order_index
  const result = await db.select<{ max_index: number }[]>(
    "SELECT COALESCE(MAX(order_index), -1) as max_index FROM blocks WHERE page_id = ?",
    [pageId]
  );
  let nextIndex = (result[0].max_index ?? -1) + 1;

  for (const block of blocks) {
    await db.execute(
      "INSERT INTO blocks (page_id, type, content, order_index) VALUES (?, ?, ?, ?)",
      [pageId, block.type, block.content, nextIndex++]
    );
  }
}

// ── Block ↔ TipTap conversion ──────────────────────────
export function blocksToTipTap(blocks: Block[]): object {
  if (blocks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }]
    };
  }

  return {
    type: "doc",
    content: blocks.map((block) => {
      try {
        return JSON.parse(block.content);
      } catch {
        return { type: "paragraph", content: [{ type: "text", text: "" }] };
      }
    })
  };
}

export function tipTapToBlocks(doc: any): Omit<Block, "id" | "page_id">[] {
  if (!doc?.content) return [];

  return doc.content.map((node: any, index: number) => {
    const type = nodeTypeToBlockType(node.type);
    return {
      type,
      content: JSON.stringify(node),
      order_index: index,
    };
  });
}

function nodeTypeToBlockType(type: string): BlockType {
  switch (type) {
    case "heading":
      return "heading1"; // will be refined by attrs.level
    case "bulletList":
      return "bulletList";
    case "orderedList":
      return "orderedList";
    case "image":
      return "image";
    case "table":
      return "table";
    default:
      return "paragraph";
  }
}


export async function prependBlocks(pageId: number, blocks: Omit<Block, "id" | "page_id">[]): Promise<void> {
    const db = await getDb();
  
    const existing = await db.select<Block[]>(
      "SELECT * FROM blocks WHERE page_id = ? ORDER BY order_index ASC",
      [pageId]
    );
  
    const filtered = existing.filter((b) => {
      try {
        const parsed = JSON.parse(b.content);
        const hasText = parsed?.content?.some((c: any) => c.text?.trim());
        return hasText;
      } catch {
        return false;
      }
    });
  
    const combined = [...blocks, ...filtered];
  
    // Wrap in transaction — delete + insert is atomic, no partial reads
    await db.execute("BEGIN TRANSACTION");
    try {
      await db.execute("DELETE FROM blocks WHERE page_id = ?", [pageId]);
      for (let i = 0; i < combined.length; i++) {
        await db.execute(
          "INSERT INTO blocks (page_id, type, content, order_index) VALUES (?, ?, ?, ?)",
          [pageId, combined[i].type, combined[i].content, i]
        );
      }
      await db.execute("COMMIT");
    } catch (e) {
      await db.execute("ROLLBACK");
      throw e;
    }
  }
  