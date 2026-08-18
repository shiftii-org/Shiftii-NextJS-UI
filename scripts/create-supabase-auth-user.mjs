import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = readLocalEnv();
const supabaseUrl = required(env, "NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const publishableKey = required(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const email = required(env, "SHIFTTII_ADMIN_EMAIL").trim().toLowerCase();
const password = required(env, "SHIFTTII_ADMIN_PASSWORD");

if (!email.includes("@")) {
  throw new Error("SHIFTTII_ADMIN_EMAIL must be a valid email address.");
}

const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
  body: JSON.stringify({ email, password }),
  headers: {
    apikey: publishableKey,
    "Content-Type": "application/json",
  },
  method: "POST",
});

const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  const message = payload?.msg ?? payload?.message ?? `Supabase Auth returned ${response.status}`;

  if (/already registered|already exists/i.test(message)) {
    console.log(`Supabase Auth user already exists for ${email}.`);
    process.exit(0);
  }

  throw new Error(message);
}

console.log(`Supabase Auth signup request completed for ${email}.`);
if (!payload?.session) {
  console.log("No session was returned. If email confirmation is enabled, confirm the user before signing in.");
}

function readLocalEnv() {
  const paths = [resolve(".env.local"), resolve(".env")];
  const values = {};

  for (const path of paths) {
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      values[key] = stripQuotes(rawValue);
    }
  }

  return { ...values, ...process.env };
}

function required(values, key) {
  const value = values[key];
  if (!value) {
    throw new Error(`${key} is required in .env.local or the shell environment.`);
  }
  return value;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
