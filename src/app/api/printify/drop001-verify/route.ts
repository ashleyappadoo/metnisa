import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getPrintifyProduct, listPrintifyProducts } from "@/lib/printify/client";

export const dynamic = "force-dynamic";

const EXECUTOR_TOKEN_SHA256 =
  "6a59f46229153a4dd923eb24b6b6462da449a4701dcbbc4d49d0a456a6081b87";
const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);
const DROP_TITLES = [
  "AYO. Essential Tee — Met Nisa",
  "AYO. Moris Tee — Met Nisa",
  "BOUZ FIX. Essential Tee — Met Nisa",
  "BOUZ FIX. Moris Tee — Met Nisa",
  "KASS PAKÉ. Essential Tee — Met Nisa",
  "KASS PAKÉ. Moris Tee — Met Nisa",
  "DAN FATAK. Essential Tee — Met Nisa",
  "DAN FATAK. Moris Tee — Met Nisa",
  "SON LA-DAN MEM. Essential Tee — Met Nisa",
  "SON LA-DAN MEM. Moris Tee — Met Nisa",
  "MALERR PENA LODERR. Essential Tee — Met Nisa",
  "MALERR PENA LODERR. Moris Tee — Met Nisa",
];

function valid(token: string | null) {
  if (!token) return false;
  const a = createHash("sha256").update(token).digest();
  const b = Buffer.from(EXECUTOR_TOKEN_SHA256, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.VERCEL_ENV !== "production" || !valid(url.searchParams.get("token"))) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const all = await listPrintifyProducts(SHOP_ID, 1, 50);
  const selected = all.data.filter((p) => DROP_TITLES.includes(p.title));
  const details = [];

  for (const summary of selected) {
    const product = await getPrintifyProduct(SHOP_ID, summary.id);
    const areas = Array.isArray(product.print_areas) ? product.print_areas : [];
    const images = areas.flatMap((area) => {
      if (!area || typeof area !== "object") return [];
      const placeholders = Array.isArray((area as { placeholders?: unknown[] }).placeholders)
        ? (area as { placeholders: unknown[] }).placeholders
        : [];
      return placeholders.flatMap((placeholder) => {
        if (!placeholder || typeof placeholder !== "object") return [];
        const position = String((placeholder as { position?: unknown }).position ?? "");
        const imgs = Array.isArray((placeholder as { images?: unknown[] }).images)
          ? (placeholder as { images: unknown[] }).images
          : [];
        return imgs.map((img) => {
          const data = img && typeof img === "object" ? (img as Record<string, unknown>) : {};
          return {
            position,
            id: String(data.id ?? ""),
            name: String(data.name ?? ""),
            src: String(data.src ?? ""),
            x: data.x ?? null,
            y: data.y ?? null,
            scale: data.scale ?? null,
            angle: data.angle ?? null,
          };
        });
      });
    });

    details.push({
      id: summary.id,
      title: summary.title,
      visible: product.visible ?? null,
      variant_count: Array.isArray(product.variants) ? product.variants.length : 0,
      enabled_variant_count: Array.isArray(product.variants)
        ? product.variants.filter((v) => v && typeof v === "object" && (v as { is_enabled?: boolean }).is_enabled).length
        : 0,
      images,
    });
  }

  const frontImageIds = details.map((p) => p.images.find((i) => i.position === "front")?.id ?? "");
  return NextResponse.json({
    ok: true,
    found: details.length,
    unique_front_images: new Set(frontImageIds.filter(Boolean)).size,
    duplicate_front_image_ids: frontImageIds.filter((id, index) => id && frontImageIds.indexOf(id) !== index),
    details,
  });
}
