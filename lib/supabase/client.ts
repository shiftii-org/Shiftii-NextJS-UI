type SupabaseFetchInit = RequestInit & {
  schema?: string;
};

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    publishableKey,
  };
}

export async function supabaseFetch<T = unknown>(
  path: string,
  init: SupabaseFetchInit = {},
): Promise<T> {
  const { url, publishableKey } = getSupabaseConfig();
  const schema = init.schema ?? "public";
  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init.headers);

  headers.set("apikey", publishableKey);
  headers.set("Authorization", `Bearer ${publishableKey}`);
  if (schema !== "public") {
    headers.set("Accept-Profile", schema);
    headers.set("Content-Profile", schema);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${url}/rest/v1${requestPath}`, {
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
