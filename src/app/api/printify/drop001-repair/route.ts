import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  getPrintifyProduct,
  getPrintifyUploadedImage,
  updatePrintifyProduct,
  uploadPrintifyImage,
} from "@/lib/printify/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EXECUTOR_TOKEN_SHA256 =
  "6a59f46229153a4dd923eb24b6b6462da449a4701dcbbc4d49d0a456a6081b87";
const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);

const PLACEMENT = { x: 0.67, y: 0.28, scale: 0.27, angle: 0 } as const;

type Edition = "Essential" | "Moris";
type RepairItem = {
  productId: string;
  phrase: string;
  edition: Edition;
  fileName: string;
};

const ITEMS: RepairItem[] = [
  ["6a9970c176f0c3a9150c99fe", "AYO.", "Essential"],
  ["6a9970c976f0c3a9150c9a08", "AYO.", "Moris"],
  ["6a9970cfd22256594e0a5fce", "BOUZ FIX.", "Essential"],
  ["6a9970d59169de6a730eedf0", "BOUZ FIX.", "Moris"],
  ["6a9970dcd0ac73b2f90d21bf", "KASS PAKÉ.", "Essential"],
  ["6a9970e29169de6a730eee08", "KASS PAKÉ.", "Moris"],
  ["6a9970e903ca0e7cdc0aa4d4", "DAN FATAK.", "Essential"],
  ["6a9970ef76f0c3a9150c9a33", "DAN FATAK.", "Moris"],
  ["6a9970f6d22256594e0a6004", "SON LA-DAN MEM.", "Essential"],
  ["6a9970fd158a2ef8a60053f0", "SON LA-DAN MEM.", "Moris"],
  ["6a997103d0ac73b2f90d21eb", "MALERR PENA LODERR.", "Essential"],
  ["6a997109d22256594e0a6011", "MALERR PENA LODERR.", "Moris"],
].map(([productId, phrase, edition]) => {
  const safePhrase = phrase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    productId,
    phrase,
    edition: edition as Edition,
    fileName: `met-nisa-drop001-${safePhrase}-${edition.toLowerCase()}-final.png`,
  };
});

function hasValidExecutorToken(token: string | null) {
  if (!token) return false;
  const supplied = createHash("sha256").update(token).digest();
  const expected = Buffer.from(EXECUTOR_TOKEN_SHA256, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgForArtwork(
  phrase: string,
  edition: Edition,
  width: number,
  height: number,
  fontSize: number,
  letterSpacing: number,
) {
  const fill = edition === "Essential" ? "#111111" : "url(#morisGradient)";
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="morisGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#E8444A"/>
          <stop offset="34%" stop-color="#2877C7"/>
          <stop offset="68%" stop-color="#F2C94C"/>
          <stop offset="100%" stop-color="#319466"/>
        </linearGradient>
      </defs>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="600"
        font-size="${fontSize}" letter-spacing="${letterSpacing}" fill="${fill}">${escapeXml(phrase)}</text>
    </svg>
  `);
}

async function measureArtwork(buffer: Buffer) {
  const { info } = await sharp(buffer).trim().png().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height };
}

async function renderArtwork(phrase: string, edition: Edition) {
  const width = 3000;
  const height = 1000;
  const targetContentHeight = 310;
  let fontSize = 400;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const letterSpacing = Math.max(8, fontSize * 0.055);
    const svg = svgForArtwork(phrase, edition, width, height, fontSize, letterSpacing);
    const buffer = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
    const measured = await measureArtwork(buffer);
    if (measured.height > 0) fontSize *= targetContentHeight / measured.height;
    if (measured.width > width * 0.9) fontSize *= (width * 0.9) / measured.width;
  }

  return sharp(
    svgForArtwork(
      phrase,
      edition,
      width,
      height,
      fontSize,
      Math.max(8, fontSize * 0.055),
    ),
  )
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 40,
      bottom: 40,
      left: 60,
      right: 60,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function variantState(product: Record<string, unknown>) {
  if (!Array.isArray(product.variants)) {
    return { allIds: [] as number[], enabledIds: [] as number[] };
  }

  const allIds: number[] = [];
  const enabledIds: number[] = [];
  for (const variant of product.variants) {
    if (!variant || typeof variant !== "object") continue;
    const data = variant as { id?: unknown; is_enabled?: boolean };
    const id = Number(data.id);
    if (!Number.isFinite(id)) continue;
    allIds.push(id);
    if (data.is_enabled) enabledIds.push(id);
  }
  return { allIds, enabledIds };
}

async function uploadUnique(
  item: RepairItem,
  artwork: Buffer,
  usedIds: Set<string>,
) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await sleep(attempt === 1 ? 1800 : 2500);
    const attemptName = item.fileName.replace(
      /\.png$/,
      `-${Date.now()}-${attempt}.png`,
    );
    const uploaded = await uploadPrintifyImage(
      attemptName,
      artwork.toString("base64"),
    );

    if (!uploaded.id || usedIds.has(uploaded.id)) continue;

    await sleep(350);
    const metadata = await getPrintifyUploadedImage(uploaded.id);
    if (metadata.id !== uploaded.id) continue;
    if (metadata.file_name !== attemptName) continue;
    if (!metadata.width || !metadata.height || !metadata.size) continue;

    usedIds.add(uploaded.id);
    return { uploaded, metadata, attempt };
  }

  throw new Error(`Unable to obtain a unique verified Printify upload for ${item.phrase} ${item.edition}`);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (
      process.env.VERCEL_ENV !== "production" ||
      !hasValidExecutorToken(url.searchParams.get("token"))
    ) {
      return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
    }

    if (url.searchParams.get("confirm") !== "REPAIR-DROP001") {
      return NextResponse.json({
        ok: true,
        mode: "plan",
        products: ITEMS.length,
        strategy: "regenerate, unique verified upload, replace front print area only",
        publish_called: false,
      });
    }

    const usedIds = new Set<string>();
    const repaired = [];

    for (const item of ITEMS) {
      const product = await getPrintifyProduct(SHOP_ID, item.productId);
      const { allIds, enabledIds } = variantState(product);
      if (!allIds.length || !enabledIds.length) {
        throw new Error(`Variant state invalid on ${item.productId}`);
      }

      const artwork = await renderArtwork(item.phrase, item.edition);
      const { uploaded, metadata, attempt } = await uploadUnique(item, artwork, usedIds);

      // Printify validates print area coverage against the entire blueprint/provider
      // variant set, even though only a subset is enabled for sale.
      await updatePrintifyProduct(SHOP_ID, item.productId, {
        print_areas: [
          {
            variant_ids: allIds,
            placeholders: [
              {
                position: "front",
                decoration_method: "dtg",
                images: [
                  {
                    id: uploaded.id,
                    ...PLACEMENT,
                  },
                ],
              },
            ],
          },
        ],
      });

      const check = await getPrintifyProduct(SHOP_ID, item.productId);
      const areas = Array.isArray(check.print_areas) ? check.print_areas : [];
      const ids = areas.flatMap((area) => {
        if (!area || typeof area !== "object") return [];
        const placeholders = Array.isArray((area as { placeholders?: unknown[] }).placeholders)
          ? (area as { placeholders: unknown[] }).placeholders
          : [];
        return placeholders.flatMap((placeholder) => {
          if (!placeholder || typeof placeholder !== "object") return [];
          if (String((placeholder as { position?: unknown }).position ?? "") !== "front") return [];
          const images = Array.isArray((placeholder as { images?: unknown[] }).images)
            ? (placeholder as { images: unknown[] }).images
            : [];
          return images.flatMap((image) => {
            if (!image || typeof image !== "object") return [];
            return [String((image as { id?: unknown }).id ?? "")];
          });
        });
      });

      if (!ids.includes(uploaded.id)) {
        throw new Error(`Front image replacement did not persist for ${item.productId}`);
      }

      const checkState = variantState(check);
      if (checkState.enabledIds.length !== enabledIds.length) {
        throw new Error(`Enabled variant count changed unexpectedly for ${item.productId}`);
      }

      repaired.push({
        product_id: item.productId,
        phrase: item.phrase,
        edition: item.edition,
        image_id: uploaded.id,
        file_name: metadata.file_name,
        upload_attempt: attempt,
        total_variants: allIds.length,
        enabled_variants: enabledIds.length,
        visible: check.visible ?? null,
      });
    }

    return NextResponse.json({
      ok: true,
      repaired_count: repaired.length,
      unique_image_count: usedIds.size,
      repaired,
      publish_called: false,
    });
  } catch (error) {
    console.error("DROP001_REPAIR_FAILED", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        publish_called: false,
      },
      { status: 500 },
    );
  }
}
