#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Minecraft Network Template — startup script
#  Set DATABASE_URL, JWT_SECRET, and PORT before running.
# ─────────────────────────────────────────────────────────

export DATABASE_URL="${DATABASE_URL:?DATABASE_URL env var is required}"
export JWT_SECRET="${JWT_SECRET:-change-me-in-production}"
export PORT="${PORT:-3000}"
export NODE_ENV="production"

echo "Starting server on port $PORT ..."
node dist/index.cjs
