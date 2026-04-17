/**
 * Legacy image migration script
 *
 * Converts /uploads/... file paths stored in the DB to base64 data URIs so
 * images survive deployments (the /uploads directory is ephemeral on Replit).
 *
 * Run once before or immediately after deploying:
 *   npx tsx server/migrate-legacy-images.ts
 *
 * Records whose files are already gone are logged as MISSING — those campaigns
 * or products will need their images re-uploaded via the admin panel.
 */

import { db } from "./db";
import { campaigns, campaignProducts } from "@shared/schema";
import { like, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function migrateImages() {
  console.log("Starting legacy image migration...\n");

  let migratedCount = 0;
  let missingCount = 0;

  const legacyCampaigns = await db
    .select({ id: campaigns.id, title: campaigns.title, imageUrl: campaigns.imageUrl })
    .from(campaigns)
    .where(like(campaigns.imageUrl, "/uploads/%"));

  console.log(`Found ${legacyCampaigns.length} campaign(s) with legacy image paths.`);

  for (const campaign of legacyCampaigns) {
    const filePath = path.join(process.cwd(), campaign.imageUrl!);
    if (!fs.existsSync(filePath)) {
      console.log(`  [MISSING] Campaign "${campaign.title}" — file not found: ${campaign.imageUrl}`);
      missingCount++;
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    await db.update(campaigns)
      .set({ imageUrl: base64 })
      .where(eq(campaigns.id, campaign.id));

    console.log(`  [OK] Campaign "${campaign.title}" — migrated to base64 (${Math.round(buffer.length / 1024)}KB)`);
    migratedCount++;
  }

  const legacyProducts = await db
    .select({ id: campaignProducts.id, name: campaignProducts.name, imageUrl: campaignProducts.imageUrl })
    .from(campaignProducts)
    .where(like(campaignProducts.imageUrl, "/uploads/%"));

  console.log(`\nFound ${legacyProducts.length} product(s) with legacy image paths.`);

  for (const product of legacyProducts) {
    const filePath = path.join(process.cwd(), product.imageUrl!);
    if (!fs.existsSync(filePath)) {
      console.log(`  [MISSING] Product "${product.name}" — file not found: ${product.imageUrl}`);
      missingCount++;
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    await db.update(campaignProducts)
      .set({ imageUrl: base64 })
      .where(eq(campaignProducts.id, product.id));

    console.log(`  [OK] Product "${product.name}" — migrated to base64 (${Math.round(buffer.length / 1024)}KB)`);
    migratedCount++;
  }

  console.log(`
Migration complete:
  Migrated: ${migratedCount}
  Missing on disk (skipped): ${missingCount}
  `);
}

migrateImages().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
