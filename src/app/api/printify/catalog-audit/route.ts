import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = "https://api.printify.com/v1";
const SHOP_ID = 28801697;

async function pf(path: string) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error("PRINTIFY_API_TOKEN missing");
  const r = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "GOGOT-Catalog-Audit/1.0",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Printify ${r.status}: ${(await r.text()).slice(0,500)}`);
  return r.json();
}

function uniq(values: unknown[]) {
  return Array.from(new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0))).sort();
}

export async function GET() {
  try {
    const list = await pf(`/shops/${SHOP_ID}/products.json?limit=50&page=1`);
    const products = Array.isArray(list?.data) ? list.data : [];

    const detailed = [];
    for (const p of products) {
      const d = await pf(`/shops/${SHOP_ID}/products/${p.id}.json`);
      const variants = Array.isArray(d?.variants) ? d.variants : [];
      const enabled = variants.filter((v: any) => v?.is_enabled);
      detailed.push({
        id: d.id,
        title: d.title,
        visible: d.visible,
        blueprint_id: d.blueprint_id,
        print_provider_id: d.print_provider_id,
        total_variants: variants.length,
        enabled_variants: enabled.length,
        colors: uniq(enabled.map((v: any) => v?.options?.color)),
        sizes: uniq(enabled.map((v: any) => v?.options?.size)),
        prices_cents: enabled.map((v: any) => v?.price).filter((x: any) => typeof x === "number"),
      });
    }

    const pairs = Array.from(new Set(detailed.map((p: any) => `${p.blueprint_id}:${p.print_provider_id}`)));
    const catalog = [];
    for (const pair of pairs) {
      const [bp, pp] = pair.split(":").map(Number);
      const [provider, blueprint, shipping] = await Promise.all([
        pf(`/catalog/print_providers/${pp}.json`),
        pf(`/catalog/blueprints/${bp}.json`),
        pf(`/catalog/blueprints/${bp}/print_providers/${pp}/shipping.json`),
      ]);
      const profiles = Array.isArray(shipping?.profiles) ? shipping.profiles : [];
      catalog.push({
        blueprint_id: bp,
        blueprint_title: blueprint?.title,
        brand: blueprint?.brand,
        model: blueprint?.model,
        print_provider_id: pp,
        print_provider_title: provider?.title,
        print_provider_location: provider?.location,
        shipping_profile_count: profiles.length,
        shipping: shipping,
      });
    }

    return NextResponse.json({
      ok: true,
      shop_id: SHOP_ID,
      product_count: detailed.length,
      products: detailed,
      catalog,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
