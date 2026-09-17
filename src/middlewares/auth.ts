import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nexcore-admin-secret-2025";

export interface AdminPayload {
  id: number;
  username: string;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    (req as Request & { admin: AdminPayload }).admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const admin = (req as Request & { admin?: AdminPayload }).admin;
  if (!admin || (admin.role !== "owner" && admin.role !== "co-owner")) {
    res.status(403).json({ error: "Owner permission required" });
    return;
  }
  next();
}

export function signToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
