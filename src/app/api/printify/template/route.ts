import { NextResponse } from "next/server";
import { getPrintifyProduct, PrintifyApiError } from "@/lib/printify/client";

export const dynamic = "force-dynamic";

const SHOP_ID = 28801697;
const TEMPLATE_PRODUCT_ID = "6a993aa509b4b2bf6402d628";

export async function GET() {
  try {
    const product = await getPrintifyProduct(SHOP_ID, TEMPLATE_PRODUCT_ID);
    return NextResponse.json(product, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof PrintifyApiError) {
      return NextResponse.json(
        { ok: false, status: error.status, error: error.message },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
