import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  bookSectionsTable,
  booksTable,
  db,
  type Book,
} from "@workspace/db";

export type BookWithSectionCount = Book & { sectionCount: number };

export async function addSectionCounts(books: Book[]): Promise<BookWithSectionCount[]> {
  if (books.length === 0) return [];

  const counts = await db
    .select({
      bookId: bookSectionsTable.bookId,
      sectionCount: sql<number>`count(*)::int`,
    })
    .from(bookSectionsTable)
    .where(inArray(bookSectionsTable.bookId, books.map((book) => book.id)))
    .groupBy(bookSectionsTable.bookId);

  const countByBookId = new Map(counts.map((row) => [row.bookId, row.sectionCount]));
  return books.map((book) => ({
    ...book,
    sectionCount: countByBookId.get(book.id) ?? 0,
  }));
}

export async function getBookDetail(bookId: number) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) return null;

  const [bookWithCount] = await addSectionCounts([book]);
  const sections = await db
    .select()
    .from(bookSectionsTable)
    .where(eq(bookSectionsTable.bookId, bookId))
    .orderBy(asc(bookSectionsTable.position));

  return { book: bookWithCount, sections };
}

export async function getPublishedBookCount(): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(booksTable)
    .where(eq(booksTable.status, "published"));
  return result?.value ?? 0;
}

export const newestBooksOrder = [desc(booksTable.createdAt), desc(booksTable.id)];
export const alphabeticalBooksOrder = [asc(booksTable.title), asc(booksTable.id)];
export const featuredBooksOrder = [desc(booksTable.featured), desc(booksTable.createdAt)];
export const visibleBooksCondition = and(eq(booksTable.status, "published"));
