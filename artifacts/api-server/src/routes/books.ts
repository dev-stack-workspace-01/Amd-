import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetBookParams,
  GetBookResponse,
  GetLibraryOverviewResponse,
  ListBooksQueryParams,
  ListBooksResponse,
} from "@workspace/api-zod";
import {
  bookSectionsTable,
  booksTable,
  db,
  favoritesTable,
} from "@workspace/db";
import { getSignedInUserId, isAdminUser } from "../lib/access";
import { addSectionCounts, getBookDetail } from "../lib/books";

const router: IRouter = Router();

router.get("/library/overview", async (_req, res): Promise<void> => {
  const [featuredRows, recentRows, categoryCounts, bookTotalRows, sectionTotalRows] =
    await Promise.all([
      db
        .select()
        .from(booksTable)
        .where(and(eq(booksTable.status, "published"), eq(booksTable.featured, true)))
        .orderBy(desc(booksTable.createdAt))
        .limit(3),
      db
        .select()
        .from(booksTable)
        .where(eq(booksTable.status, "published"))
        .orderBy(desc(booksTable.createdAt))
        .limit(6),
      db
        .select({
          name: booksTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(booksTable)
        .where(eq(booksTable.status, "published"))
        .groupBy(booksTable.category)
        .orderBy(asc(booksTable.category)),
      db
        .select({ value: count() })
        .from(booksTable)
        .where(eq(booksTable.status, "published")),
      db
        .select({ value: count() })
        .from(bookSectionsTable)
        .innerJoin(booksTable, eq(bookSectionsTable.bookId, booksTable.id))
        .where(eq(booksTable.status, "published")),
    ]);

  const [featuredBooks, recentBooks] = await Promise.all([
    addSectionCounts(featuredRows),
    addSectionCounts(recentRows),
  ]);

  res.json(
    GetLibraryOverviewResponse.parse({
      featuredBooks,
      recentBooks,
      categoryCounts,
      totalBooks: bookTotalRows[0]?.value ?? 0,
      totalSections: sectionTotalRows[0]?.value ?? 0,
    }),
  );
});

router.get("/books", async (req, res): Promise<void> => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, category, sort, limit, offset } = parsed.data;
  const conditions = [];
  const userId = getSignedInUserId(req);
  if (!userId) {
    conditions.push(eq(booksTable.status, "published"));
  } else {
    try {
      if (!(await isAdminUser(userId))) {
        conditions.push(eq(booksTable.status, "published"));
      }
    } catch (error) {
      // Fail closed: a temporary Clerk API outage must never expose draft books.
      req.log.warn({ err: error }, "Unable to resolve library role for book search");
      conditions.push(eq(booksTable.status, "published"));
    }
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(booksTable.title, term),
        ilike(booksTable.author, term),
        ilike(booksTable.description, term),
      )!,
    );
  }
  if (category) conditions.push(eq(booksTable.category, category));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, categories] = await Promise.all([
    db.select({ value: count() }).from(booksTable).where(whereClause),
    db
      .selectDistinct({ name: booksTable.category })
      .from(booksTable)
      .where(eq(booksTable.status, "published"))
      .orderBy(asc(booksTable.category)),
  ]);
  const total = totalRows[0]?.value ?? 0;

  let rows;
  if (sort === "popular") {
    const popularRows = await db
      .select({
        book: booksTable,
        favoriteCount: count(favoritesTable.id),
      })
      .from(booksTable)
      .leftJoin(favoritesTable, eq(favoritesTable.bookId, booksTable.id))
      .where(whereClause)
      .groupBy(booksTable.id)
      .orderBy(desc(count(favoritesTable.id)), desc(booksTable.createdAt))
      .limit(limit)
      .offset(offset);
    rows = popularRows.map((row) => row.book);
  } else {
    rows = await db
      .select()
      .from(booksTable)
      .where(whereClause)
      .orderBy(
        ...(sort === "title"
          ? [asc(booksTable.title), asc(booksTable.id)]
          : [desc(booksTable.createdAt), desc(booksTable.id)]),
      )
      .limit(limit)
      .offset(offset);
  }

  const items = await addSectionCounts(rows);
  res.json(
    ListBooksResponse.parse({
      items,
      total,
      limit,
      offset,
      categories: categories.map((row) => row.name),
    }),
  );
});

router.get("/books/:bookId", async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const detail = await getBookDetail(params.data.bookId);
  if (!detail) {
    res.status(404).json({ error: "Book not found." });
    return;
  }

  if (detail.book.status !== "published") {
    const userId = getSignedInUserId(req);
    let allowed = false;
    if (userId) {
      try {
        allowed = await isAdminUser(userId);
      } catch (error) {
        req.log.warn({ err: error }, "Unable to resolve library role for book detail");
      }
    }
    if (!allowed) {
      res.status(404).json({ error: "Book not found." });
      return;
    }
  }

  res.json(GetBookResponse.parse(detail));
});

export default router;
