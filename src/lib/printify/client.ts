const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export type PrintifyShop = {
  id: number;
  title: string;
  sales_channel: string;
};

export type PrintifyProductSummary = {
  id: string;
  title: string;
  visible?: boolean;
  blueprint_id?: number;
  print_provider_id?: number;
};

export type PrintifyProductList = {
  current_page: number;
  data: PrintifyProductSummary[];
  first_page_url?: string;
  from?: number;
  last_page?: number;
  last_page_url?: string;
  links?: unknown[];
  next_page_url?: string | null;
  path?: string;
  per_page?: number;
  prev_page_url?: string | null;
  to?: number;
  total?: number;
};

export class PrintifyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PrintifyApiError";
    this.status = status;
  }
}

function getPrintifyToken() {
  const token = process.env.PRINTIFY_API_TOKEN;

  if (!token) {
    throw new Error("PRINTIFY_API_TOKEN is not configured");
  }

  return token;
}

async function printifyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${PRINTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPrintifyToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PrintifyApiError(
      `Printify API request failed (${response.status}): ${body.slice(0, 500)}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function listPrintifyShops() {
  return printifyFetch<PrintifyShop[]>("/shops.json");
}

export function listPrintifyProducts(shopId: number, page = 1, limit = 10) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return printifyFetch<PrintifyProductList>(
    `/shops/${shopId}/products.json?${params.toString()}`,
  );
}
