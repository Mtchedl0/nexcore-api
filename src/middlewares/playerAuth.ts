import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nexcore-admin-secret-2025";

export interface PlayerPayload {
  id: number;
  username: string;
  minecraftUsername: string;
  role: string;
}

export function signPlayerToken(payload: PlayerPayload): string {
  return jwt.sign({ ...payload, type: "player" }, JWT_SECRET, { expiresIn: "30d" });
}

export function requirePlayer(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Login required" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as PlayerPayload & { type?: string };
    if (payload.type !== "player") {
      res.status(401).json({ error: "Invalid token type" });
      return;
    }
    (req as Request & { player: PlayerPayload }).player = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
