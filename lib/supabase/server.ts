import { supabaseFetch as browserSupabaseFetch } from "./client";

type SupabaseServerFetchInit = RequestInit & {
  schema?: string;
};

export async function supabaseFetch<T = unknown>(
  path: string,
  init: SupabaseServerFetchInit = {},
): Promise<T> {
  return browserSupabaseFetch<T>(path, {
    cache: "no-store",
    ...init,
  });
}
