import { pool } from "../lib/db/src/index.js";
import bcrypt from "bcryptjs";

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(30) NOT NULL DEFAULT 'update',
        author_id INTEGER,
        author_name VARCHAR(50) NOT NULL,
        author_role VARCHAR(20) NOT NULL,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        minecraft_username VARCHAR(50) NOT NULL,
        suspended BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        player_username VARCHAR(50) NOT NULL,
        minecraft_username VARCHAR(50) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        gamemode VARCHAR(50) NOT NULL,
        price VARCHAR(30) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'player'`);
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        server_name VARCHAR(100) NOT NULL DEFAULT 'SERVER NAME',
        server_ip VARCHAR(100) NOT NULL DEFAULT 'servername.net',
        discord_url VARCHAR(200) NOT NULL DEFAULT 'https://discord.gg/servername',
        primary_color VARCHAR(50) NOT NULL DEFAULT '0 84% 60%',
        secondary_color VARCHAR(50) NOT NULL DEFAULT '25 95% 53%',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) NOT NULL DEFAULT '0 84% 60%'`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50) NOT NULL DEFAULT '25 95% 53%'`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_enabled BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_text VARCHAR(300) DEFAULT ''`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_color VARCHAR(50) DEFAULT 'primary'`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_link VARCHAR(300) DEFAULT ''`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_message VARCHAR(300) DEFAULT 'We are performing scheduled maintenance.'`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_subtitle VARCHAR(300) DEFAULT 'We''ll be back shortly. Follow our Discord for live updates.'`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS staff_apps_open BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS staff_form_config TEXT`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS ban_appeals_open BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500) DEFAULT ''`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) DEFAULT ''`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS ticker_text VARCHAR(1000) DEFAULT ''`);
    await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS partner_apps_open BOOLEAN DEFAULT false`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        platform VARCHAR(50) NOT NULL DEFAULT 'YouTube',
        channel_url VARCHAR(300) NOT NULL DEFAULT '',
        subscriber_count VARCHAR(50) NOT NULL DEFAULT '',
        avatar_url VARCHAR(500) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        discord VARCHAR(100) NOT NULL DEFAULT '',
        channel_url VARCHAR(300) NOT NULL,
        platform VARCHAR(50) NOT NULL DEFAULT 'YouTube',
        subscriber_count VARCHAR(50) NOT NULL DEFAULT '',
        content_type VARCHAR(100) NOT NULL DEFAULT '',
        why_partner TEXT NOT NULL DEFAULT '',
        additional_info TEXT NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        admin_notes TEXT NOT NULL DEFAULT '',
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ban_appeals (
        id SERIAL PRIMARY KEY,
        minecraft_username TEXT NOT NULL,
        discord_username TEXT NOT NULL,
        ban_reason TEXT NOT NULL DEFAULT '',
        appeal_reason TEXT NOT NULL DEFAULT '',
        additional_info TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT DEFAULT '',
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      INSERT INTO site_settings (server_name, server_ip, discord_url)
      SELECT 'SERVER NAME', 'servername.net', 'https://discord.gg/servername'
      WHERE NOT EXISTS (SELECT 1 FROM site_settings)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vote_sites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        url VARCHAR(300) NOT NULL,
        icon VARCHAR(20) NOT NULL DEFAULT '🗳️',
        description TEXT NOT NULL DEFAULT '',
        reward VARCHAR(200) NOT NULL DEFAULT '',
        cooldown VARCHAR(100) NOT NULL DEFAULT 'Every 24 hours',
        color_gradient VARCHAR(200) NOT NULL DEFAULT 'from-primary to-accent',
        display_order INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE vote_sites ADD COLUMN IF NOT EXISTS callback_token VARCHAR(64)`);
    await client.query(`
      UPDATE vote_sites SET callback_token = md5(random()::text || clock_timestamp()::text || id::text) WHERE callback_token IS NULL
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL,
        site_name VARCHAR(100) NOT NULL,
        player_username VARCHAR(50) NOT NULL,
        voted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS votes_player_idx ON votes (player_username)`);
    await client.query(`CREATE INDEX IF NOT EXISTS votes_site_idx ON votes (site_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS votes_voted_at_idx ON votes (voted_at)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS store_items (
        id SERIAL PRIMARY KEY,
        category VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        price VARCHAR(50) NOT NULL,
        icon VARCHAR(10) DEFAULT '⭐',
        badge VARCHAR(50),
        features JSONB DEFAULT '[]',
        color_theme VARCHAR(30) DEFAULT 'red',
        meta JSONB DEFAULT '{}',
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE store_items ADD COLUMN IF NOT EXISTS sale_price VARCHAR(50)`);
    await client.query(`ALTER TABLE store_items ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE store_items ADD COLUMN IF NOT EXISTS featured_label VARCHAR(100) DEFAULT 'Featured'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faq_items (
        id SERIAL PRIMARY KEY,
        question VARCHAR(400) NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { rows: faqCheck } = await client.query("SELECT COUNT(*) FROM faq_items");
    if (parseInt(faqCheck[0].count) === 0) {
      const defaultFaqs = [
        { q: "How do I receive my rank after purchasing?", a: "Your rank is applied automatically within a few minutes of payment confirmation. Join the server and it will be active. If you don't receive it within 10 minutes, contact our support on Discord.", cat: "Purchases", order: 1 },
        { q: "Are ranks permanent?", a: "Yes! All ranks are a one-time purchase and last forever. They won't disappear between seasons unless stated otherwise.", cat: "Purchases", order: 2 },
        { q: "What currency are prices in?", a: "All prices are in USD ($). Payment methods include card and PayPal.", cat: "Purchases", order: 3 },
        { q: "Can I upgrade my rank later?", a: "Yes, upgrades are available at a discounted price. Contact a staff member on our Discord server for upgrade pricing.", cat: "Purchases", order: 4 },
        { q: "Do coins carry over between seasons?", a: "Coins are tied to your account and persist across seasons unless a full economy reset is announced with advance notice.", cat: "General", order: 5 },
        { q: "How do I report a bug or player?", a: "Please open a ticket on our Discord server or use the /report command in-game. Our staff team reviews all reports within 24 hours.", cat: "General", order: 6 },
      ];
      for (const faq of defaultFaqs) {
        await client.query(
          `INSERT INTO faq_items (question, answer, category, display_order) VALUES ($1, $2, $3, $4)`,
          [faq.q, faq.a, faq.cat, faq.order]
        );
      }
      console.log("Seeded FAQ items");
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_applications (
        id SERIAL PRIMARY KEY,
        minecraft_username VARCHAR(50) NOT NULL,
        discord_username VARCHAR(100) NOT NULL,
        age VARCHAR(10) NOT NULL,
        timezone VARCHAR(100) NOT NULL,
        why_apply TEXT NOT NULL,
        experience TEXT DEFAULT '',
        hours_per_week VARCHAR(50) DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        admin_notes TEXT DEFAULT '',
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE staff_applications ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        rule TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL DEFAULT 'percent',
        value INTEGER NOT NULL DEFAULT 10,
        min_order INTEGER DEFAULT 0,
        max_uses INTEGER DEFAULT 0,
        uses_count INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gamemodes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '⚔️',
        status VARCHAR(20) DEFAULT 'active',
        players VARCHAR(50) DEFAULT 'Open',
        description TEXT,
        features JSONB DEFAULT '[]',
        color_theme VARCHAR(30) DEFAULT 'red',
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { rows: siRows } = await client.query("SELECT COUNT(*) FROM store_items");
    if (parseInt(siRows[0].count) === 0) {
      const storeItems = [
        { category: "lifesteal", name: "VIP", price: "500", icon: "⭐", badge: null, colorTheme: "cyan", displayOrder: 0,
          features: ["Cyan Chat Color", "/nick command", "1.5x Coin Multiplier", "Join Full Server", "3 Vote Crates/mo", "VIP Tag in Chat"],
          meta: {} },
        { category: "lifesteal", name: "MVP", price: "1,000", icon: "💎", badge: "Most Popular", colorTheme: "red", displayOrder: 1,
          features: ["Red Chat Color", "/fly in Lobby", "2x Coin Multiplier", "Priority Queue", "5 Vote Crates/mo", "Custom Join Message", "MVP Tag in Chat"],
          meta: {} },
        { category: "lifesteal", name: "LEGEND", price: "2,000", icon: "👑", badge: "Best Value", colorTheme: "amber", displayOrder: 2,
          features: ["Gold Chat Color", "/vanish command", "3x Coin Multiplier", "Highest Priority", "10 Vote Crates/mo", "Exclusive Pets & Tags", "LEGEND Tag in Chat"],
          meta: {} },

        { category: "bedwars", name: "VIP", price: "300", icon: "⭐", badge: null, colorTheme: "blue", displayOrder: 0,
          features: ["Blue Prefix [VIP]", "1.2x Coins Boost", "2 Extra Forge Slots", "Custom Death Messages", "VIP Kit Access"],
          meta: {} },
        { category: "bedwars", name: "VIP+", price: "500", icon: "🌟", badge: null, colorTheme: "indigo", displayOrder: 1,
          features: ["Blue Prefix [VIP+]", "1.5x Coins Boost", "3 Extra Forge Slots", "Custom Win Animations", "VIP+ Kit Access", "Bonus Armor Kit"],
          meta: {} },
        { category: "bedwars", name: "MVP", price: "800", icon: "💎", badge: "Most Popular", colorTheme: "red", displayOrder: 2,
          features: ["Red Prefix [MVP]", "2x Coins Boost", "5 Extra Forge Slots", "Custom Kill Effects", "MVP Kit Access", "Exclusive Bed Skins", "Win Streak Tracker"],
          meta: {} },
        { category: "bedwars", name: "MVP+", price: "1,200", icon: "🔥", badge: null, colorTheme: "orange", displayOrder: 3,
          features: ["Orange Prefix [MVP+]", "2.5x Coins Boost", "Unlimited Forge Slots", "Custom Projectile Trail", "All Kit Access", "Exclusive Auras", "Priority Matchmaking"],
          meta: {} },
        { category: "bedwars", name: "MVP++", price: "2,000", icon: "👑", badge: "Ultimate", colorTheme: "yellow", displayOrder: 4,
          features: ["Gold Prefix [MVP++]", "3x Coins Boost", "Unlimited Everything", "Legendary Particle Effects", "All Kits + Exclusive Kit", "Custom Island Theme", "Priority Support", "Season Badge"],
          meta: {} },

        { category: "ls-money", name: "Small Bundle", price: "150", icon: "💵", badge: null, colorTheme: "green", displayOrder: 0,
          features: [], meta: { amount: "5,000", unit: "Money", bonus: "", perUnit: "0.03" } },
        { category: "ls-money", name: "Value Bundle", price: "400", icon: "💳", badge: null, colorTheme: "emerald", displayOrder: 1,
          features: [], meta: { amount: "15,000", unit: "Money", bonus: "+2,000 Bonus", bonusCoins: 2000, perUnit: "0.024" } },
        { category: "ls-money", name: "Rich Bundle", price: "800", icon: "🏦", badge: "Best Deal", colorTheme: "teal", displayOrder: 2,
          features: [], meta: { amount: "35,000", unit: "Money", bonus: "+7,500 Bonus", bonusCoins: 7500, perUnit: "0.019" } },
        { category: "ls-money", name: "Millionaire", price: "2,000", icon: "👑", badge: null, colorTheme: "cyan", displayOrder: 3,
          features: [], meta: { amount: "100,000", unit: "Money", bonus: "+25,000 Bonus", bonusCoins: 25000, perUnit: "0.016" } },

        { category: "bw-coins", name: "Starter Pack", price: "150", icon: "🪙", badge: null, colorTheme: "zinc", displayOrder: 0,
          features: [], meta: { amount: "1,000", unit: "Coins", bonus: "", perUnit: "0.15" } },
        { category: "bw-coins", name: "Value Pack", price: "600", icon: "💰", badge: null, colorTheme: "amber", displayOrder: 1,
          features: [], meta: { amount: "5,000", unit: "Coins", bonus: "+500 Bonus", bonusCoins: 500, perUnit: "0.11" } },
        { category: "bw-coins", name: "Premium Pack", price: "1,000", icon: "💎", badge: "Best Deal", colorTheme: "red", displayOrder: 2,
          features: [], meta: { amount: "50,000", unit: "Coins", bonus: "+5,000 Bonus", bonusCoins: 5000, perUnit: "0.08" } },
        { category: "bw-coins", name: "Mega Pack", price: "2,000", icon: "👑", badge: null, colorTheme: "yellow", displayOrder: 3,
          features: [], meta: { amount: "100,000", unit: "Coins", bonus: "+15,000 Bonus", bonusCoins: 15000, perUnit: "0.06" } },
      ];

      for (const item of storeItems) {
        await client.query(
          `INSERT INTO store_items (category, name, price, icon, badge, features, color_theme, meta, display_order)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9)`,
          [item.category, item.name, item.price, item.icon, item.badge, JSON.stringify(item.features), item.colorTheme, JSON.stringify(item.meta), item.displayOrder]
        );
      }
      console.log("Seeded store items");
    }

    const { rows: gmRows } = await client.query("SELECT COUNT(*) FROM gamemodes");
    if (parseInt(gmRows[0].count) === 0) {
      const gamemodes = [
        { title: "LifeSteal SMP", icon: "❤️", status: "active", players: "Open", colorTheme: "red", displayOrder: 0,
          description: "The ultimate hardcore survival experience. When you kill a player, you steal one of their hearts, adding it to your own max health. Die and you lose a heart permanently — fall to zero hearts and you're out. Build alliances, set traps, and dominate the server.",
          features: ["Steal hearts on kill", "Permanent heart loss on death", "Alliance system", "Custom enchants", "Seasonal resets", "Heart shards & crafting"] },
        { title: "BedWars", icon: "🛏️", status: "active", players: "Open", colorTheme: "orange", displayOrder: 1,
          description: "Protect your bed at all costs while destroying the beds of enemy teams. Once your bed is destroyed you can't respawn — so when you die, you're eliminated. Gather resources, buy upgrades, and work with your team to be the last standing.",
          features: ["Solo & Team modes", "Custom maps", "Item shop system", "Ranked ladder", "Team upgrades", "Cosmetic unlocks"] },
        { title: "Duels", icon: "⚔️", status: "coming-soon", players: "Coming Soon", colorTheme: "blue", displayOrder: 2,
          description: "Challenge other players to 1v1 battles in custom arenas. Pick your kit, prove your skill, and climb the competitive ranked ladder. Seasonal tournaments, custom kits, and spectator mode make this the ultimate PvP experience.",
          features: ["1v1 custom arenas", "Multiple kit types", "Ranked ELO system", "Seasonal tournaments", "Spectator mode", "Win streak rewards"] },
      ];

      for (const gm of gamemodes) {
        await client.query(
          `INSERT INTO gamemodes (title, icon, status, players, description, features, color_theme, display_order)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
          [gm.title, gm.icon, gm.status, gm.players, gm.description, JSON.stringify(gm.features), gm.colorTheme, gm.displayOrder]
        );
      }
      console.log("Seeded gamemodes");
    }

    const { rows: adminCheck } = await client.query("SELECT COUNT(*) FROM admin_users WHERE username = 'admin'");
    if (parseInt(adminCheck[0].count) === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
        ["admin", hash, "owner"]
      );
      console.log("Seeded default admin account — username: admin, password: admin123");
    }

    console.log("Database ready.");
  } catch (err) {
    console.error("Database init error:", err);
    throw err;
  } finally {
    client.release();
  }
}
