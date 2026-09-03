import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  createPrintifyProduct,
  getPrintifyProduct,
  listPrintifyProducts,
  uploadPrintifyImage,
} from "@/lib/printify/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Edition = "Essential" | "Moris";

type TemplateVariant = {
  id: number;
  price: number;
  is_enabled: boolean;
  title?: string;
  options?: number[];
};

type TemplateOptionValue = {
  id: number;
  title: string;
};

type TemplateOption = {
  name: string;
  type?: string;
  values: TemplateOptionValue[];
};

type TemplateImage = {
  id: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
  src?: string;
  width?: number;
  height?: number;
  pattern?: unknown;
};

type TemplatePlaceholder = {
  position: string;
  images: TemplateImage[];
};

type TemplatePrintArea = {
  variant_ids: number[];
  placeholders: TemplatePlaceholder[];
};

type TemplateProduct = {
  id: string;
  title: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: TemplateVariant[];
  options?: TemplateOption[];
  print_areas: TemplatePrintArea[];
};

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
  const safeEdition = edition.toLowerCase();

  return {
    phrase,
    edition: edition as Edition,
    title: `${phrase} ${edition} Tee — Met Nisa`,
    fileName: `met-nisa-drop001-${safePhrase}-${safeEdition}.png`,
  };
});

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
    "<ul><li>100% Airlume combed &amp; ring-spun cotton</li><li>Lightweight and breathable fabric</li><li>Modern retail fit with classic crew neckline</li><li>Ribbed knit collar, shoulder tape and side seams</li><li>Tear-away label</li><li>REACH certified</li><li>High-quality print for a clean, lasting finish</li></ul>",
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

function getFrontImage(template: TemplateProduct) {
  for (const area of template.print_areas) {
    const placeholder = area.placeholders.find(
      (item) => item.position === "front" && item.images.length > 0,
    );
    if (placeholder) return placeholder.images[0];
  }

  throw new Error("Template has no front artwork to use as placement reference");
}

function getPositions(template: TemplateProduct) {
  return new Set(
    template.print_areas.flatMap((area) =>
      area.placeholders.map((placeholder) => placeholder.position),
    ),
  );
}

function getWhiteValueIds(template: TemplateProduct) {
  const ids = new Set<number>();
  const colorOption = template.options?.find(
    (option) =>
      option.type?.toLowerCase() === "color" ||
      option.name.toLowerCase().includes("color"),
  );

  for (const value of colorOption?.values ?? []) {
    if (/\bwhite\b/i.test(value.title)) ids.add(value.id);
  }

  return ids;
}

function isWhiteVariant(variant: TemplateVariant, whiteIds: Set<number>) {
  if (variant.options?.some((optionId) => whiteIds.has(optionId))) return true;
  return /\bwhite\b/i.test(variant.title ?? "");
}

function cleanImage(image: TemplateImage, replacementId?: string) {
  return {
    id: replacementId ?? image.id,
    x: image.x,
    y: image.y,
    scale: image.scale,
    angle: image.angle,
    ...(image.pattern ? { pattern: image.pattern } : {}),
  };
}

function clonePrintAreas(template: TemplateProduct, frontImageId: string) {
  return template.print_areas.map((area) => ({
    variant_ids: [...area.variant_ids],
    placeholders: area.placeholders.map((placeholder) => ({
      position: placeholder.position,
      images: placeholder.images.map((image) =>
        cleanImage(image, placeholder.position === "front" ? frontImageId : undefined),
      ),
    })),
  }));
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

async function renderArtwork(
  phrase: string,
  edition: Edition,
  width: number,
  height: number,
  targetContentHeight: number,
) {
  let fontSize = Math.max(64, targetContentHeight * 1.28);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const letterSpacing = Math.max(2, fontSize * 0.045);
    const svg = svgForArtwork(phrase, edition, width, height, fontSize, letterSpacing);
    const buffer = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
    const measured = await measureArtwork(buffer);

    if (measured.height > 0) {
      fontSize *= targetContentHeight / measured.height;
    }

    if (measured.width > width * 0.9) {
      fontSize *= (width * 0.9) / measured.width;
    }
  }

  const svg = svgForArtwork(
    phrase,
    edition,
    width,
    height,
    fontSize,
    Math.max(2, fontSize * 0.045),
  );

  return sharp(svg).png({ compressionLevel: 9 }).toBuffer();
}

async function getArtworkGeometry(frontImage: TemplateImage) {
  let width = Number(frontImage.width ?? 0);
  let height = Number(frontImage.height ?? 0);
  let contentHeight = 0;

  if (frontImage.src) {
    const response = await fetch(frontImage.src, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to fetch template front artwork (${response.status})`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(sourceBuffer).metadata();
    width ||= metadata.width ?? 0;
    height ||= metadata.height ?? 0;

    try {
      const measured = await measureArtwork(sourceBuffer);
      contentHeight = measured.height;
    } catch {
      contentHeight = 0;
    }
  }

  if (!width || !height) {
    throw new Error("Unable to determine template front artwork dimensions");
  }

  if (!contentHeight || contentHeight > height * 0.8) {
    contentHeight = Math.max(120, Math.round(height * 0.1));
  }

  return { width, height, contentHeight };
}

function variantsForEdition(
  template: TemplateProduct,
  edition: Edition,
  whiteIds: Set<number>,
) {
  return template.variants.map((variant) => ({
    id: variant.id,
    price: variant.price,
    is_enabled:
      edition === "Essential"
        ? variant.is_enabled
        : variant.is_enabled && isWhiteVariant(variant, whiteIds),
  }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    if (
      process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "printify-bootstrap"
    ) {
      return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
    }

    if (url.searchParams.get("confirm") !== "DROP001") {
      return NextResponse.json(
        { ok: false, error: "Missing DROP001 confirmation" },
        { status: 400 },
      );
    }

    const shopId = Number(process.env.PRINTIFY_SHOP_ID);
    const templateProductId = process.env.PRINTIFY_TEMPLATE_PRODUCT_ID;

    if (!shopId || !templateProductId) {
      throw new Error("PRINTIFY_SHOP_ID or PRINTIFY_TEMPLATE_PRODUCT_ID is missing");
    }

    const rawTemplate = await getPrintifyProduct(shopId, templateProductId);
    const template = rawTemplate as unknown as TemplateProduct;

    if (!template.blueprint_id || !template.print_provider_id) {
      throw new Error("Template blueprint/provider is invalid");
    }
    if (!template.variants?.length || !template.print_areas?.length) {
      throw new Error("Template variants or print areas are missing");
    }

    const positions = getPositions(template);
    const requiredPositions = ["front", "right_sleeve", "neck_label_inner"];
    const missingPositions = requiredPositions.filter((position) => !positions.has(position));
    if (missingPositions.length) {
      throw new Error(`Template missing print positions: ${missingPositions.join(", ")}`);
    }

    const whiteIds = getWhiteValueIds(template);
    const whiteEnabled = template.variants.filter(
      (variant) => variant.is_enabled && isWhiteVariant(variant, whiteIds),
    );
    if (!whiteEnabled.length) {
      throw new Error("No enabled White variants found on template; no product was created");
    }

    const frontImage = getFrontImage(template);
    const geometry = await getArtworkGeometry(frontImage);

    // Generate every file in memory before the first Printify write.
    const generated = new Map<string, Buffer>();
    for (const product of DROP_PRODUCTS) {
      generated.set(
        product.title,
        await renderArtwork(
          product.phrase,
          product.edition,
          geometry.width,
          geometry.height,
          geometry.contentHeight,
        ),
      );
    }

    const existingProducts = await listAllProducts(shopId);
    const existingByTitle = new Map(existingProducts.map((product) => [product.title, product]));

    const created: Array<{
      title: string;
      id: string;
      edition: Edition;
      visible: boolean | null;
      front_image_id: string;
    }> = [];
    const skipped: Array<{ title: string; id: string; reason: string }> = [];

    for (const product of DROP_PRODUCTS) {
      const existing = existingByTitle.get(product.title);
      if (existing) {
        skipped.push({
          title: product.title,
          id: existing.id,
          reason: "already_exists",
        });
        continue;
      }

      const imageBuffer = generated.get(product.title);
      if (!imageBuffer) throw new Error(`Artwork buffer missing for ${product.title}`);

      const uploaded = await uploadPrintifyImage(
        product.fileName,
        imageBuffer.toString("base64"),
      );

      const variants = variantsForEdition(template, product.edition, whiteIds);
      const enabledCount = variants.filter((variant) => variant.is_enabled).length;
      if (!enabledCount) {
        throw new Error(`No enabled variants for ${product.title}`);
      }

      const result = await createPrintifyProduct(shopId, {
        title: product.title,
        description: buildDescription(product.phrase, product.edition),
        blueprint_id: template.blueprint_id,
        print_provider_id: template.print_provider_id,
        variants,
        print_areas: clonePrintAreas(template, uploaded.id),
      });

      const id = String(result.id ?? "");
      if (!id) throw new Error(`Printify returned no product id for ${product.title}`);

      created.push({
        title: product.title,
        id,
        edition: product.edition,
        visible: typeof result.visible === "boolean" ? result.visible : null,
        front_image_id: uploaded.id,
      });

      existingByTitle.set(product.title, { id, title: product.title });
    }

    return NextResponse.json({
      ok: true,
      shop_id: shopId,
      template: {
        id: template.id,
        title: template.title,
        blueprint_id: template.blueprint_id,
        print_provider_id: template.print_provider_id,
        source_front_image_id: frontImage.id,
        source_front_placement: {
          x: frontImage.x,
          y: frontImage.y,
          scale: frontImage.scale,
          angle: frontImage.angle,
        },
        artwork_geometry: geometry,
        positions: [...positions],
        enabled_variant_count: template.variants.filter((variant) => variant.is_enabled).length,
        white_enabled_variant_count: whiteEnabled.length,
      },
      created_count: created.length,
      skipped_count: skipped.length,
      created,
      skipped,
      publish_called: false,
    });
  } catch (error) {
    console.error("DROP001_CREATE_FAILED", error);
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
