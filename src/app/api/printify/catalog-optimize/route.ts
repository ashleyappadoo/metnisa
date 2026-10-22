import { NextResponse } from "next/server";
import { getPrintifyProduct, listPrintifyProducts, updatePrintifyProduct } from "@/lib/printify/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);
const CONFIRM = "GOGOT-CATALOG-OPTIMIZE-20261022-Q7M9";

const TITLE_BY_ID: Record<string,string> = {
  "6ab151db407d45be7d087888":"LA FAYA. Essential Tee — GOGOT.",
  "6ab1516896db56dfcc0a3c18":"BOUZ FIX. Essential Tee — GOGOT.",
  "6ab14d7efa1054e41d07db0a":"DELERYOM. Essential Tee — GOGOT.",
  "6ab14ca65a6f95317f02f913":"BEL MARI. Essential Tee — GOGOT.",
  "6ab14c4fa4a4f1b980077f64":"LARRYAZ. Essential Tee — GOGOT.",
  "6ab14bd296e54bc13b0a28c1":"BATT BIS. Essential Tee — GOGOT.",
  "6ab14b43674d37126403ee32":"BATT LAKOL. Essential Tee — GOGOT.",
  "6ab14a2eb60c8b761505dbf1":"KASS PAKÉ. Essential Tee — GOGOT.",
  "6ab147ce674d37126403ecbe":"MET NISA. Essential Tee — GOGOT.",
  "6a993aa509b4b2bf6402d628":"GOGOT. Signature Tee — Moris in You",
  "6abacf296c3b0a18940bf88d":"GOGOT. Sunset Wave Hoodie — Essential",
  "6abacee67ad9f15eac0a08bb":"GOGOT. Sunset Wave Hoodie — Gradient",
};

const TEE_COLORS = new Set([
  "White",
  "Heather Raspberry",
  "Heather Columbia Blue",
  "Heather Green",
  "Heather Mustard",
]);

function sizeFromTitle(title:string) {
  const parts = title.split(" / ");
  return parts[parts.length-1] ?? "";
}
function colorFromTitle(title:string) {
  return title.split(" / ")[0] ?? "";
}
function teePrice(size:string) {
  if (size==="2XL") return 3199;
  if (size==="3XL") return 3499;
  if (size==="4XL") return 3699;
  if (size==="5XL") return 3999;
  return 2999;
}
function hoodiePrice(size:string, gradient:boolean) {
  const base = gradient ? 4799 : 4499;
  if (size==="2XL") return gradient ? 5099 : 4799;
  if (size==="3XL") return gradient ? 5299 : 4999;
  if (size==="4XL") return gradient ? 5499 : 5199;
  if (size==="5XL") return gradient ? 5599 : 5299;
  return base;
}
function normalizeDescription(raw:string, isHoodie:boolean) {
  let d = raw || "";
  if (isHoodie) {
    d = d.replace(/Sweatshirt/g, "Hoodie").replace(/sweatshirt/g, "hoodie");
  }
  if (!/GOGOT\./i.test(d)) {
    d = '<p><strong>GOGOT. — Moris in you.</strong></p>' + d;
  }
  if (!/DROP 001/i.test(d)) {
    d += '<p>Part of <strong>GOGOT. DROP 001 — MORIS IN YOU</strong>.</p>';
  }
  return d;
}
async function publishProduct(productId:string) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error("PRINTIFY_API_TOKEN missing");
  const r = await fetch(`https://api.printify.com/v1/shops/${SHOP_ID}/products/${productId}/publish.json`, {
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","User-Agent":"GOGOT-Catalog-Optimize/1.0"},
    body:JSON.stringify({title:true,description:true,images:false,variants:true,tags:false,keyFeatures:false,shipping_template:false}),
    cache:"no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Publish failed ${productId}: ${r.status} ${text.slice(0,300)}`);
  return r.status;
}

export async function GET(request:Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== CONFIRM) {
      return NextResponse.json({
        ok:true, mode:"plan",
        actions:[
          "Normalize 12 product titles to GOGOT naming",
          "Normalize tee prices by size",
          "Restrict Essential tees to five approved light/mid-tone colors",
          "Normalize hoodie prices by size and edition",
          "Add GOGOT/Drop 001 framing where missing",
          "Copy full EU safety information to Gradient hoodie",
          "Republish title/description/variant changes",
        ],
        artwork_changed:false, print_areas_changed:false,
      });
    }

    const list = await listPrintifyProducts(SHOP_ID,1,50);
    const essentialHoodie = await getPrintifyProduct(SHOP_ID,"6abacf296c3b0a18940bf88d") as any;
    const hoodieSafety = typeof essentialHoodie.safety_information==="string" ? essentialHoodie.safety_information : "";

    const changed:any[]=[];
    for (const p of list.data) {
      const d:any = await getPrintifyProduct(SHOP_ID,p.id);
      if (!TITLE_BY_ID[d.id]) continue;
      const isTee = d.blueprint_id===12;
      const isHoodie = d.blueprint_id===77;
      const gradient = d.id==="6abacee67ad9f15eac0a08bb";
      const variants = (Array.isArray(d.variants)?d.variants:[]).map((v:any)=>{
        const size=sizeFromTitle(String(v.title||""));
        const color=colorFromTitle(String(v.title||""));
        const enabled = isTee ? Boolean(v.is_enabled) && TEE_COLORS.has(color) : Boolean(v.is_enabled);
        return {
          id:v.id,
          price:isTee ? teePrice(size) : isHoodie ? hoodiePrice(size,gradient) : v.price,
          is_enabled:enabled,
        };
      });

      const payload:any = {
        title: TITLE_BY_ID[d.id],
        description: normalizeDescription(String(d.description||""),isHoodie),
        variants,
      };
      if (gradient && hoodieSafety) payload.safety_information = hoodieSafety;

      await updatePrintifyProduct(SHOP_ID,d.id,payload);
      const publishStatus = await publishProduct(d.id);
      const check:any = await getPrintifyProduct(SHOP_ID,d.id);
      const enabledCheck=(Array.isArray(check.variants)?check.variants:[]).filter((v:any)=>v?.is_enabled);

      changed.push({
        id:d.id,
        before_title:d.title,
        after_title:check.title,
        enabled_variants:enabledCheck.length,
        colors:Array.from(new Set(enabledCheck.map((v:any)=>colorFromTitle(String(v.title||"")))).filter(Boolean)).sort(),
        min_price:Math.min(...enabledCheck.map((v:any)=>Number(v.price)||Infinity)),
        max_price:Math.max(...enabledCheck.map((v:any)=>Number(v.price)||0)),
        safety_length:typeof check.safety_information==="string"?check.safety_information.length:0,
        publish_status:publishStatus,
      });
    }

    return NextResponse.json({ok:true,changed_count:changed.length,artwork_changed:false,print_areas_changed:false,changed});
  } catch(e) {
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"unknown"},{status:500});
  }
}
