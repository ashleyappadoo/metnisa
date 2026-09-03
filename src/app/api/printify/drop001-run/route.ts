import { GET as executeDrop001 } from "../drop001-create/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  process.env.PRINTIFY_SHOP_ID ||= "28801697";
  process.env.PRINTIFY_TEMPLATE_PRODUCT_ID ||= "6a993aa509b4b2bf6402d628";
  return executeDrop001(request);
}
