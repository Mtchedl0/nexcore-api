import { db } from "../lib/db/src/index.js";
import { adminUsersTable } from "../lib/db/src/schema/index.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmins() {
  const owners = [
    { username: "SIKKA", password: "nexcore2025", role: "owner" },
    { username: "NOTzBB", password: "nexcore2025", role: "owner" },
    { username: "GAMINGTHAMI", password: "nexcore2025", role: "owner" },
    { username: "NEXTLEVEL", password: "nexcore2025", role: "owner" },
    { username: "Maleesha", password: "nexcore2025", role: "owner" },
    { username: "MRNAVI", password: "nexcore2025", role: "admin" },
  ];

  for (const owner of owners) {
    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, owner.username))
      .limit(1);

    if (existing.length > 0) {
      console.log(`${owner.username} already exists, skipping.`);
      continue;
    }

    const hash = await bcrypt.hash(owner.password, 10);
    await db.insert(adminUsersTable).values({
      username: owner.username,
      passwordHash: hash,
      role: owner.role,
    });
    console.log(`Created ${owner.role}: ${owner.username}`);
  }

  console.log("Done. Default password is: nexcore2025");
  process.exit(0);
}

seedAdmins().catch((e) => { console.error(e); process.exit(1); });
