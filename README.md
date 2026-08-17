# Shiftii Workforce UI

Next.js/Vinext dashboard for Shiftii workforce scheduling. The app reads live
workspace data from Supabase and uses the Shiftii backend API for staff
invitations.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout` for the CI/install helper
- A Supabase project URL and publishable key
- Shiftii backend admin credentials if you need to send staff invitations

## Clone And Run Locally

Clone the repository and install dependencies:

```bash
git clone https://github.com/shiftii-org/Shiftii-NextJS-UI.git
cd Shiftii-NextJS-UI
npm ci
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SHIFTTII_API_BASE_URL=https://shiftii-gkeh.onrender.com/api
SHIFTTII_ADMIN_ORG_CODE=your-org-code
SHIFTTII_ADMIN_EMAIL=your-admin-email
SHIFTTII_ADMIN_PASSWORD=your-admin-password
```

Run the local dev server:

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

If `npm` is unavailable on Windows but `node_modules` already exists, the dev
server can also be started directly:

```powershell
$env:WRANGLER_LOG_PATH=".wrangler/wrangler.log"
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3000
```

Never commit `.env.local`. It contains private server-side credentials and is
already ignored by Git.

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Supabase

The app is wired for the connected Supabase project with lightweight REST helpers in `lib/supabase/`:

- `lib/supabase/client.ts` exports `getSupabaseConfig()` and `supabaseFetch()` for browser-safe calls.
- `lib/supabase/server.ts` wraps `supabaseFetch()` with `cache: "no-store"` for Server Components, Server Actions, and Route Handlers.

Set these runtime variables in Sites or in a local `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Call PostgREST paths through the helper, for example `supabaseFetch("staff?select=*")`. Use the publishable key only in `NEXT_PUBLIC_` client-facing variables. Do not expose service role or secret keys to browser code.

## Staff Invitations

The invitation system uses the Shiftii backend API, not direct browser calls.

- `POST /api/invitations` validates an email and role, then sends the invite
  through `POST /api/invite/send/`.
- `/invite/accept/[token]` validates a token through
  `GET /api/invite/accept/{token}/`.
- `POST /api/invitations/register` completes staff account creation through
  `POST /api/auth/staff/register/`.

The Next.js route handlers read `SHIFTTII_ADMIN_ORG_CODE`,
`SHIFTTII_ADMIN_EMAIL`, and `SHIFTTII_ADMIN_PASSWORD` from server-side
environment variables. Do not expose those values with `NEXT_PUBLIC_` prefixes.

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
