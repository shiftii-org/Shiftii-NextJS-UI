import { getSupabaseConfig, shouldSendSupabaseBearer } from "./client";

type SupabaseServerFetchInit = RequestInit & {
  schema?: string;
};

export function getSupabaseServerConfig() {
  const { url, publishableKey } = getSupabaseConfig();
  const elevatedKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    key: elevatedKey ?? publishableKey,
    url,
    usesElevatedKey: Boolean(elevatedKey),
  };
}

export async function supabaseFetch<T = unknown>(
  path: string,
  init: SupabaseServerFetchInit = {},
): Promise<T> {
  const { key, url } = getSupabaseServerConfig();
  const schema = init.schema ?? "public";
  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init.headers);

  headers.set("apikey", key);
  if (shouldSendSupabaseBearer(key)) {
    headers.set("Authorization", `Bearer ${key}`);
  }
  if (schema !== "public") {
    headers.set("Accept-Profile", schema);
    headers.set("Content-Profile", schema);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${url}/rest/v1${requestPath}`, {
    cache: "no-store",
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
