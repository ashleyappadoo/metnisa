import { NextResponse } from "next/server";
import { getPrintifyProduct, listPrintifyProducts } from "@/lib/printify/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SHOP_ID = Number(process.env.PRINTIFY_SHOP_ID || 28801697);

function stats(xs:number[]) {
  return xs.length ? {min:Math.min(...xs),max:Math.max(...xs)} : {min:null,max:null};
}

export async function GET() {
  try {
    const list = await listPrintifyProducts(SHOP_ID,1,50);
    const products=[];
    for (const p of list.data) {
      const d:any = await getPrintifyProduct(SHOP_ID,p.id);
      const enabled=(Array.isArray(d.variants)?d.variants:[]).filter((v:any)=>v?.is_enabled);
      const costs=enabled.map((v:any)=>v.cost).filter((x:any)=>typeof x==="number");
      const prices=enabled.map((v:any)=>v.price).filter((x:any)=>typeof x==="number");
      const colors=Array.from(new Set(enabled.map((v:any)=>String(v.title||"").split(" / ")[0]).filter(Boolean))).sort();
      const sizes=Array.from(new Set(enabled.map((v:any)=>String(v.title||"").split(" / ")[1]).filter(Boolean))).sort();
      products.push({
        id:d.id,title:d.title,visible:d.visible,blueprint_id:d.blueprint_id,print_provider_id:d.print_provider_id,
        enabled_variants:enabled.length,colors,sizes,cost_cents:stats(costs),price_cents:stats(prices),
        desc_len:typeof d.description==="string"?d.description.length:0,
        desc_gogot:typeof d.description==="string"&&/gogot/i.test(d.description),
        desc_metnisa:typeof d.description==="string"&&/met nisa/i.test(d.description),
        desc_drop001:typeof d.description==="string"&&/drop 001/i.test(d.description),
        safety_len:typeof d.safety_information==="string"?d.safety_information.length:0,
        safety_eu:typeof d.safety_information==="string"&&/Association ONA/i.test(d.safety_information),
      });
    }
    return NextResponse.json({ok:true,count:products.length,products},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"unknown"},{status:500});
  }
}
