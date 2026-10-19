import { clerkClient, getAuth } from "@clerk/express";
import type { Request, Response } from "express";

const adminLookupCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const ADMIN_CACHE_TTL = 60_000;

export function getSignedInUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const configuredEmails = new Set(
    (process.env.AMD_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (configuredEmails.size === 0) return false;

  const cached = adminLookupCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.isAdmin;

  const user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.primaryEmailAddress;
  const isAdmin =
    primaryEmail?.verification?.status === "verified" &&
    configuredEmails.has(primaryEmail.emailAddress.toLowerCase());

  adminLookupCache.set(userId, {
    isAdmin,
    expiresAt: Date.now() + ADMIN_CACHE_TTL,
  });
  return isAdmin;
}

export async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const userId = getSignedInUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in is required." });
    return false;
  }

  try {
    if (await isAdminUser(userId)) return true;
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to verify library administrator");
    res.status(503).json({ error: "Administrator access could not be verified." });
    return false;
  }

  res.status(403).json({ error: "Administrator access is required." });
  return false;
}
