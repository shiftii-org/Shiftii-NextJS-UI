interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1Result<T = Record<string, unknown>> {
  error?: string;
  meta: Record<string, unknown>;
  results?: T[];
  success: boolean;
}

type D1Response = D1Result;

interface D1PreparedStatement {
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  raw<T = unknown[]>(): Promise<T[]>;
  run<T = D1Result>(): Promise<T>;
}

interface D1Database {
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  dump(): Promise<ArrayBuffer>;
  exec(query: string): Promise<D1ExecResult>;
  prepare(query: string): D1PreparedStatement;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}
