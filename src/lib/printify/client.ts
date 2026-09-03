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

export type PrintifyCatalogVariant = {
  id: number;
  title: string;
  options?: Record<string, string | number>;
  placeholders?: Array<{
    position: string;
    height?: number;
    width?: number;
    decoration_method?: string;
  }>;
  cost?: number;
  is_enabled?: boolean;
  is_available?: boolean;
};

export type PrintifyUploadedImage = {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
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
      "User-Agent": "MetNisa/1.0",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PrintifyApiError(
      `Printify API request failed (${response.status}): ${body.slice(0, 1000)}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
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

export function getPrintifyProduct(shopId: number, productId: string) {
  return printifyFetch<Record<string, unknown>>(
    `/shops/${shopId}/products/${productId}.json`,
  );
}

export function updatePrintifyProduct(
  shopId: number,
  productId: string,
  payload: Record<string, unknown>,
) {
  return printifyFetch<Record<string, unknown>>(
    `/shops/${shopId}/products/${productId}.json`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function getPrintifyCatalogVariants(
  blueprintId: number,
  printProviderId: number,
) {
  return printifyFetch<{ id: number; variants: PrintifyCatalogVariant[] }>(
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
  );
}

export function uploadPrintifyImage(fileName: string, contents: string) {
  return printifyFetch<PrintifyUploadedImage>("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, contents }),
  });
}

export function getPrintifyUploadedImage(imageId: string) {
  return printifyFetch<PrintifyUploadedImage>(`/uploads/${imageId}.json`);
}

export function createPrintifyProduct(
  shopId: number,
  payload: Record<string, unknown>,
) {
  return printifyFetch<Record<string, unknown>>(
    `/shops/${shopId}/products.json`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
