import { NextResponse } from "next/server";
import {
  listPrintifyProducts,
  listPrintifyShops,
  PrintifyApiError,
} from "@/lib/printify/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const shops = await listPrintifyShops();
    const connectedShops = shops.filter(
      (shop) => shop.sales_channel !== "disconnected",
    );

    const results = await Promise.all(
      connectedShops.map(async (shop) => {
        const products = await listPrintifyProducts(shop.id, 1, 10);

        return {
          id: shop.id,
          title: shop.title,
          sales_channel: shop.sales_channel,
          product_count: products.total ?? products.data.length,
          products: products.data.map((product) => ({
            id: product.id,
            title: product.title,
            visible: product.visible ?? null,
            blueprint_id: product.blueprint_id ?? null,
            print_provider_id: product.print_provider_id ?? null,
          })),
        };
      }),
    );

    return NextResponse.json(
      {
        ok: true,
        connected: true,
        shop_count: results.length,
        shops: results,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof PrintifyApiError) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          error: "PRINTIFY_API_ERROR",
          status: error.status,
        },
        { status: 502 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error:
          message === "PRINTIFY_API_TOKEN is not configured"
            ? "PRINTIFY_TOKEN_NOT_CONFIGURED"
            : "PRINTIFY_BOOTSTRAP_FAILED",
      },
      { status: 500 },
    );
  }
}
