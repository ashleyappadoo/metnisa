import { NextResponse } from "next/server";
import { getPrintifyProduct, listPrintifyProducts } from "@/lib/printify/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);

type OptValue = { id?: number; title?: string };
type Opt = { name?: string; type?: string; values?: OptValue[] };

function optionMap(options: Opt[] | undefined) {
  const m = new Map<number, string>();
  for (const opt of options ?? []) {
    for (const v of opt.values ?? []) {
      if (typeof v.id === "number" && typeof v.title === "string") m.set(v.id, v.title);
    }
  }
  return m;
}

function stats(xs: number[]) {
  if (!xs.length) return { min: null, max: null, avg: null };
  return {
    min: Math.min(...xs),
    max: Math.max(...xs),
    avg: Math.round(xs.reduce((a,b)=>a+b,0)/xs.length),
  };
}

export async function GET() {
  try {
    const list = await listPrintifyProducts(SHOP_ID, 1, 50);
    const out = [];
    for (const p of list.data) {
      const d = await getPrintifyProduct(SHOP_ID, p.id) as any;
      const map = optionMap(Array.isArray(d.options) ? d.options : []);
      const enabled = (Array.isArray(d.variants) ? d.variants : []).filter((v:any)=>v?.is_enabled);
      const variants = enabled.map((v:any)=>({
        id: v.id,
        title: v.title,
        cost: v.cost,
        price: v.price,
        available: v.is_available,
        options: Array.isArray(v.options) ? v.options.map((id:number)=>map.get(id) ?? String(id)) : [],
      }));
      const costs = variants.map((v:any)=>v.cost).filter((x:any)=>typeof x==="number");
      const prices = variants.map((v:any)=>v.price).filter((x:any)=>typeof x==="number");
      out.push({
        id: d.id,
        title: d.title,
        visible: d.visible,
        blueprint_id: d.blueprint_id,
        print_provider_id: d.print_provider_id,
        description_length: typeof d.description === "string" ? d.description.length : 0,
        description_has_met_nisa: typeof d.description === "string" && /met nisa/i.test(d.description),
        description_has_gogot: typeof d.description === "string" && /gogot/i.test(d.description),
        safety_length: typeof d.safety_information === "string" ? d.safety_information.length : 0,
        safety_has_eu_responsible_person: typeof d.safety_information === "string" && /Association ONA/i.test(d.safety_information),
        enabled_variant_count: variants.length,
        cost_cents: stats(costs),
        price_cents: stats(prices),
        variants,
      });
    }
    return NextResponse.json({ ok:true, count:out.length, products:out }, {headers:{"Cache-Control":"no-store"}});
  } catch (e) {
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"unknown"},{status:500});
  }
}
