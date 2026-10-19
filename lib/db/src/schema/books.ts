import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  coverUrl: text("cover_url"),
  readerUrl: text("reader_url"),
  downloadUrl: text("download_url"),
  featured: boolean("featured").notNull().default(false),
  publishedYear: integer("published_year"),
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;

export const bookSectionsTable = pgTable(
  "book_sections",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    pageNumber: integer("page_number"),
  },
  (table) => [uniqueIndex("book_sections_book_position_idx").on(table.bookId, table.position)],
);

export const insertBookSectionSchema = createInsertSchema(bookSectionsTable).omit({ id: true });
export type InsertBookSection = z.infer<typeof insertBookSectionSchema>;
export type BookSection = typeof bookSectionsTable.$inferSelect;
