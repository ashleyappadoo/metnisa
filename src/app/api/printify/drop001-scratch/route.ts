import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  createPrintifyProduct,
  getPrintifyCatalogVariants,
  listPrintifyProducts,
  uploadPrintifyImage,
  type PrintifyCatalogVariant,
} from "@/lib/printify/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXECUTOR_TOKEN_SHA256 =
  "6a59f46229153a4dd923eb24b6b6462da449a4701dcbbc4d49d0a456a6081b87";

const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);
const BLUEPRINT_ID = 12; // Bella+Canvas 3001 — Unisex Jersey Short Sleeve Tee
const PRINT_PROVIDER_ID = 29; // Monster Digital
const RETAIL_PRICE = 2499; // $24.99
const GARMENT_COLOR = "White";
const ALLOWED_SIZES = new Set(["XS", "S", "M", "L", "XL", "2XL", "3XL"]);

const PLACEMENT = {
  x: 0.67,
  y: 0.28,
  scale: 0.27,
  angle: 0,
} as const;

type Edition = "Essential" | "Moris";

type DropProduct = {
  phrase: string;
  edition: Edition;
  title: string;
  fileName: string;
};

const DROP_PRODUCTS: DropProduct[] = [
  ["AYO.", "Essential"],
  ["AYO.", "Moris"],
  ["BOUZ FIX.", "Essential"],
  ["BOUZ FIX.", "Moris"],
  ["KASS PAKÉ.", "Essential"],
  ["KASS PAKÉ.", "Moris"],
  ["DAN FATAK.", "Essential"],
  ["DAN FATAK.", "Moris"],
  ["SON LA-DAN MEM.", "Essential"],
  ["SON LA-DAN MEM.", "Moris"],
  ["MALERR PENA LODERR.", "Essential"],
  ["MALERR PENA LODERR.", "Moris"],
].map(([phrase, edition]) => {
  const safePhrase = phrase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    phrase,
    edition: edition as Edition,
    title: `${phrase} ${edition} Tee — Met Nisa`,
    fileName: `met-nisa-drop001-${safePhrase}-${edition.toLowerCase()}.png`,
  };
});

function hasValidExecutorToken(token: string | null) {
  if (!token) return false;
  const supplied = createHash("sha256").update(token).digest();
  const expected = Buffer.from(EXECUTOR_TOKEN_SHA256, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildDescription(phrase: string, edition: Edition) {
  const editionLine =
    edition === "Moris"
      ? "Finished with the Met Nisa Moris Gradient — red, blue, yellow and green blended into one understated cultural signature."
      : "Finished in Met Nisa Ink for a clean, understated essential look.";

  return [
    "<p><strong>Moris in you.</strong></p>",
    `<p>The <strong>${escapeXml(phrase)}</strong> Tee is part of <strong>Drop 001 — MORIS IN YOU</strong>: a minimalist piece built around a Mauritian expression recognized by those who know.</p>`,
    `<p>${editionLine}</p>`,
    "<p>Designed with a premium quiet-streetwear aesthetic, this lightweight jersey tee combines everyday comfort with a clean retail fit. Made from 100% Airlume combed and ring-spun cotton, it feels soft against the skin, breathes easily and layers effortlessly.</p>",
    "<p><strong>Product features</strong></p>",
    "<ul><li>Bella+Canvas 3001 unisex jersey short sleeve tee</li><li>100% Airlume combed &amp; ring-spun cotton on solid colors</li><li>Lightweight and breathable fabric</li><li>Modern retail fit with classic crew neckline</li><li>Ribbed knit collar, shoulder tape and side seams</li><li>Tear-away label</li></ul>",
    "<p><strong>Fit &amp; style</strong></p>",
    "<p>A versatile unisex silhouette made for everyday wear. Pair it with denim, cargos, shorts or a jacket for an effortless minimalist look.</p>",
    "<p><strong>Care instructions</strong></p>",
    "<ul><li>Machine wash cold, max 30°C / 90°F</li><li>Non-chlorine bleach</li><li>Tumble dry low</li><li>Iron or steam on medium</li><li>Do not dry clean</li></ul>",
    "<p><strong>Wear it in Mauritius. Wear it abroad. Keep Moris with you.</strong></p>",
  ].join("");
}

async function listAllProducts(shopId: number) {
  const products: Array<{ id: string; title: string; visible?: boolean }> = [];
  let page = 1;

  while (page <= 50) {
    const result = await listPrintifyProducts(shopId, page, 50);
    products.push(...result.data);
    if (!result.next_page_url || result.data.length === 0) break;
    page += 1;
  }

  return products;
}

function normalizeOption(value: string | number | undefined) {
  return String(value ?? "").trim();
}

function getVariantColor(variant: PrintifyCatalogVariant) {
  return normalizeOption(variant.options?.color);
}

function getVariantSize(variant: PrintifyCatalogVariant) {
  return normalizeOption(variant.options?.size).toUpperCase();
}

function hasFrontDtg(variant: PrintifyCatalogVariant) {
  return (variant.placeholders ?? []).some(
    (placeholder) => placeholder.position === "front",
  );
}

function selectVariants(variants: PrintifyCatalogVariant[]) {
  const selected = variants.filter((variant) => {
    const color = getVariantColor(variant);
    const size = getVariantSize(variant);
    const available = variant.is_available !== false && variant.is_enabled !== false;
    return (
      available &&
      color.toLowerCase() === GARMENT_COLOR.toLowerCase() &&
      ALLOWED_SIZES.has(size) &&
      hasFrontDtg(variant)
    );
  });

  const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  return selected.sort(
    (a, b) => order.indexOf(getVariantSize(a)) - order.indexOf(getVariantSize(b)),
  );
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
    .extend({ top: 40, bottom: 40, left: 60, right: 60, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function getFrontDecorationMethod(variant: PrintifyCatalogVariant) {
  const front = (variant.placeholders ?? []).find(
    (placeholder) => placeholder.position === "front",
  );
  return String((front as { decoration_method?: string } | undefined)?.decoration_method ?? "dtg");
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

    if (!SHOP_ID) throw new Error("Printify shop id is missing");

    const catalog = await getPrintifyCatalogVariants(BLUEPRINT_ID, PRINT_PROVIDER_ID);
    const variants = catalog.variants ?? [];
    const selected = selectVariants(variants);

    if (!selected.length) {
      throw new Error("No in-stock White Bella+Canvas 3001 variants found for Monster Digital");
    }

    const selectedSizes = selected.map(getVariantSize);
    const missingSizes = [...ALLOWED_SIZES].filter((size) => !selectedSizes.includes(size));
    const decorationMethod = getFrontDecorationMethod(selected[0]);

    const plan = {
      shop_id: SHOP_ID,
      blueprint_id: BLUEPRINT_ID,
      print_provider_id: PRINT_PROVIDER_ID,
      garment: "Bella+Canvas 3001 — Unisex Jersey Short Sleeve Tee",
      garment_color: GARMENT_COLOR,
      sizes: selectedSizes,
      missing_sizes: missingSizes,
      retail_price: RETAIL_PRICE,
      retail_price_display: `$${(RETAIL_PRICE / 100).toFixed(2)}`,
      placement: { ...PLACEMENT, position: "front", decoration_method: decorationMethod },
      product_count: DROP_PRODUCTS.length,
      products: DROP_PRODUCTS.map(({ title, phrase, edition }) => ({ title, phrase, edition })),
      publish_called: false,
    };

    if (url.searchParams.get("action") !== "create") {
      return NextResponse.json({ ok: true, mode: "plan", plan });
    }

    if (url.searchParams.get("confirm") !== "DROP001-SCRATCH") {
      return NextResponse.json({ ok: false, error: "Confirmation missing", plan }, { status: 400 });
    }

    const existingProducts = await listAllProducts(SHOP_ID);
    const existingByTitle = new Map(existingProducts.map((product) => [product.title, product]));
    const created: Array<{ title: string; id: string; visible: boolean | null; image_id: string }> = [];
    const skipped: Array<{ title: string; id: string; reason: string }> = [];

    for (const product of DROP_PRODUCTS) {
      const existing = existingByTitle.get(product.title);
      if (existing) {
        skipped.push({ title: product.title, id: existing.id, reason: "already_exists" });
        continue;
      }

      const artwork = await renderArtwork(product.phrase, product.edition);
      const uploaded = await uploadPrintifyImage(product.fileName, artwork.toString("base64"));
      const variantIds = selected.map((variant) => variant.id);

      const result = await createPrintifyProduct(SHOP_ID, {
        title: product.title,
        description: buildDescription(product.phrase, product.edition),
        blueprint_id: BLUEPRINT_ID,
        print_provider_id: PRINT_PROVIDER_ID,
        visible: false,
        variants: selected.map((variant) => ({
          id: variant.id,
          price: RETAIL_PRICE,
          is_enabled: true,
        })),
        print_areas: [
          {
            variant_ids: variantIds,
            placeholders: [
              {
                position: "front",
                decoration_method: decorationMethod,
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

      const id = String(result.id ?? "");
      if (!id) throw new Error(`Printify returned no product id for ${product.title}`);
      created.push({
        title: product.title,
        id,
        visible: typeof result.visible === "boolean" ? result.visible : null,
        image_id: uploaded.id,
      });
      existingByTitle.set(product.title, { id, title: product.title });
    }

    return NextResponse.json({
      ok: true,
      mode: "create",
      plan,
      created_count: created.length,
      skipped_count: skipped.length,
      created,
      skipped,
      publish_called: false,
    });
  } catch (error) {
    console.error("DROP001_SCRATCH_FAILED", error);
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
