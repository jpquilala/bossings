/**
 * Uploads product photos to the public Supabase Storage bucket "products"
 * and points each Product.imageUrl at the resulting public URL.
 *
 *   1. Put the photos in ./product-images (see that folder's README.txt)
 *   2. node scripts/upload-images.mjs
 *
 * Idempotent: re-running replaces the existing object and refreshes the URL.
 * Uses the service role key, so it must only ever run locally / in CI.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const SOURCE_DIR = "product-images";
const BUCKET = "products";

/** File basename (without extension) -> product slug in the database. */
const FILE_TO_SLUG = {
  giniling: "tinadtad-giniling",
  tinadtad: "tinadtad-giniling",
  asado: "asado",
  "ham-cheese": "ham-and-cheese",
  "ham-and-cheese": "ham-and-cheese",
  hungarian: "hungarian-half-sliced",
  gulaman: "black-gulaman",
  "black-gulaman": "black-gulaman",
  lemon: "lemon-juice",
  "lemon-juice": "lemon-juice",
};

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Check .env.local`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

async function main() {
  let files;
  try {
    files = await readdir(SOURCE_DIR);
  } catch {
    console.error(`No ./${SOURCE_DIR} folder. Create it and add the photos.`);
    process.exit(1);
  }

  const images = files.filter((file) =>
    Object.keys(CONTENT_TYPES).includes(path.extname(file).toLowerCase()),
  );

  if (images.length === 0) {
    console.error(`No images found in ./${SOURCE_DIR}.`);
    console.error("Expected names: " + Object.keys(FILE_TO_SLUG).join(", "));
    process.exit(1);
  }

  // Make sure the bucket exists and is public before uploading.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.id === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) {
      console.error("Could not create bucket:", error.message);
      process.exit(1);
    }
    console.log(`created public bucket "${BUCKET}"`);
  }

  let uploaded = 0;
  const unmatched = [];

  for (const file of images) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext).toLowerCase();
    const slug = FILE_TO_SLUG[base];

    if (!slug) {
      unmatched.push(file);
      continue;
    }

    const body = await readFile(path.join(SOURCE_DIR, file));
    const objectName = `${slug}${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectName, body, {
      contentType: CONTENT_TYPES[ext],
      upsert: true,
      cacheControl: "3600",
    });

    if (upErr) {
      console.error(`  upload failed for ${file}: ${upErr.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(objectName);

    const updated = await prisma.product.updateMany({
      where: { slug },
      data: { imageUrl: publicUrl },
    });

    if (updated.count === 0) {
      console.error(`  uploaded ${file}, but no product has slug "${slug}"`);
      continue;
    }

    const kb = Math.round(body.byteLength / 1024);
    console.log(`  ${file}  ->  ${slug}  (${kb} KB)`);
    uploaded += 1;
  }

  if (unmatched.length) {
    console.log("\nSkipped (filename not recognised):");
    for (const file of unmatched) console.log("  " + file);
    console.log("Rename to one of: " + Object.keys(FILE_TO_SLUG).join(", "));
  }

  console.log(`\n${uploaded} image(s) linked.`);

  const remaining = await prisma.product.findMany({
    where: { imageUrl: null },
    select: { name: true, slug: true },
  });
  if (remaining.length) {
    console.log("Still without a photo:");
    for (const p of remaining) console.log(`  ${p.name}  (expects ${p.slug}.jpg)`);
  } else {
    console.log("Every product now has a photo.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
