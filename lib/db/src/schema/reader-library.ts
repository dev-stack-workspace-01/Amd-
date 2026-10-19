import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp, uniqueIndex, real } from "drizzle-orm/pg-core";
import { booksTable } from "./books";
import { z } from "zod/v4";

export const favoritesTable = pgTable(
  "book_favorites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("book_favorites_user_book_idx").on(table.userId, table.bookId)],
);

export const insertFavoriteSchema = createInsertSchema(favoritesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export const readingProgressTable = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number"),
    progressPercent: real("progress_percent").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("reading_progress_user_book_idx").on(table.userId, table.bookId)],
);

export const insertReadingProgressSchema = createInsertSchema(readingProgressTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
export type ReadingProgress = typeof readingProgressTable.$inferSelect;
