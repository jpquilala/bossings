# Bossing's Flying Saucer 🛸

**Sarap na Lumilipad!**

Mobile-first e-commerce site for a Filipino street-food stall in San Pablo City,
Laguna selling flying saucer sandwiches — sealed, toasted, crimped-edge stuffed
sandwiches at P35 each.

---

## Tech stack

| Category       | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 16 (React 19), App Router        |
| Language       | TypeScript (strict)                      |
| Database       | Supabase PostgreSQL + Prisma 7           |
| Caching        | Redis (optional, in-memory fallback)     |
| File storage   | Supabase Storage (`products` bucket)     |
| CSS / UI       | Tailwind CSS v4 + ShadCN UI              |
| Auth           | Supabase Auth (Google + Facebook OAuth)  |
| Access control | Row Level Security                       |
| AI             | OpenAI `gpt-5-nano`                      |
| Deployment     | Vercel                                   |
| Monitoring     | Sentry (wired, behind an env flag)       |

---

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in the values (see below)
cp .env.local .env              # Prisma CLI reads .env
npm run db:deploy               # create tables
# then apply supabase/migrations/*.sql (RLS) — see step 4
npm run db:seed                 # load the menu
npm run dev
```

Open <http://localhost:3000>.

---

## 1. Environment variables

Every variable is documented inline in [`.env.example`](.env.example). Copy it
to **`.env.local`**.

Prisma 7 no longer reads `.env` automatically, so
[`prisma.config.ts`](prisma.config.ts) and [`prisma/seed.ts`](prisma/seed.ts)
load `.env.local` (then `.env`) explicitly via `dotenv`. One file is enough —
you do not need to keep a second copy in sync.

| Variable                        | Where to find it                                     |
| ------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` key       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Same page → `service_role`. **Server only.**         |
| `DATABASE_URL`                  | Database → Connection string → **Transaction** (6543) |
| `DIRECT_URL`                    | Database → Connection string → **Session** (5432)     |

> **IPv4 note.** On newer Supabase projects the *direct* host
> (`db.<ref>.supabase.co`) resolves to **IPv6 only**. On an IPv4-only network
> it fails with `ENETUNREACH`. Use the **pooler** host for both URLs — port
> `6543` for `DATABASE_URL`, port `5432` (session mode) for `DIRECT_URL`:
>
> ```bash
> DATABASE_URL="postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
> DIRECT_URL="postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:5432/postgres"
> ```
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000`, or your Vercel URL          |
| `OPENAI_API_KEY`                | <https://platform.openai.com/api-keys>               |
| `REDIS_URL`                     | Optional. Blank ⇒ in-memory cache.                   |
| `NEXT_PUBLIC_STORE_PHONE`       | `09915481541`                                        |
| `NEXT_PUBLIC_MESSENGER_URL`     | Your `m.me/...` link                                 |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to the
> browser. Only `NEXT_PUBLIC_*` variables are safe to inline.

---

## 2. Supabase project setup

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the API keys and both connection strings into your env files.
3. Create a **public** Storage bucket named `products`
   (Storage → New bucket → name `products`, "Public bucket" on).
   The RLS migration also creates it if it does not exist.

---

## 3. Database schema (Prisma)

`prisma/schema.prisma` is the source of truth. Prisma 7 keeps connection URLs
in [`prisma.config.ts`](prisma.config.ts), which reads `DIRECT_URL`.

```bash
npm run db:migrate      # dev: create + apply a migration
npm run db:deploy       # prod/CI: apply existing migrations
npm run db:studio       # browse data
```

Money is stored as **integer centavos** (`P35.00` → `3500`) to avoid float
errors, and formatted for display by `formatPeso()` in
[`src/lib/currency.ts`](src/lib/currency.ts).

---

## 4. Row Level Security

RLS is **not** managed by Prisma. Apply the three SQL files after the tables
exist, **in order**:

```bash
supabase db push
# or paste each file into the Supabase SQL editor and run it:
#   1. 20260817000000_auth_link.sql        FK to auth.users + signup trigger
#   2. 20260817000001_rls_policies.sql     the policies below
#   3. 20260817000002_column_defaults.sql  DB-level uuid/updated_at defaults
```

> **Why file 3 matters.** Prisma generates `uuid()` and `@updatedAt` in its
> *client*, so those columns ship with no Postgres `DEFAULT`. Any write that
> does not go through Prisma — raw SQL, the Supabase dashboard, a service-role
> `supabase-js` call, an Edge Function — fails with a not-null violation until
> this runs.

What the policies enforce:

- **profiles** — a user reads and updates only their own row. A trigger pins
  `role`, so a customer cannot promote themselves to `STAFF`/`ADMIN`.
- **categories / products / product_variants** — public read (products only
  when `is_available = true`); insert, update and delete limited to
  `STAFF`/`ADMIN`.
- **orders / order_items** — a customer sees only rows where
  `user_id = auth.uid()`; staff see and update everything. There is
  deliberately **no insert policy**: all orders, guest and customer alike, are
  written by a Server Action using the service-role key. Prices are recomputed
  server-side from the live menu, so a tampered client payload cannot change
  what is charged.
- **storage.products** — public read, writes limited to `STAFF`/`ADMIN`.

### Promoting a staff member

```sql
update public.profiles set role = 'ADMIN'
where id = '<the auth.users uuid>';
```

---

## 5. OAuth provider configuration

Supabase → Authentication → Providers.

Set the site URL and redirect allow-list first
(Authentication → URL Configuration):

- **Site URL** — `http://localhost:3000` in dev, your production URL live.
- **Redirect URLs** — add `http://localhost:3000/**` and `https://your-domain/**`.

### Google

1. <https://console.cloud.google.com> → APIs & Services → Credentials.
2. Create an **OAuth client ID** → *Web application*.
3. Authorised redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste the client ID and secret into Supabase → Providers → Google, and enable it.

### Facebook

1. <https://developers.facebook.com> → create an app → add **Facebook Login**.
2. Valid OAuth Redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste the App ID and App Secret into Supabase → Providers → Facebook, and enable it.
4. Facebook requires the app to be **Live** and the `email` +
   `public_profile` permissions granted before non-testers can sign in.

The app's own callback is [`/auth/callback`](src/app/auth/callback/route.ts):
it exchanges the code for a session and upserts the `Profile` row from the
OAuth metadata on first sign-in.

**Guest checkout needs no account** — only a name and mobile number.

---

## 6. Seed the menu

```bash
npm run db:seed
```

Idempotent (upserts by slug). Loads:

- **Sandwiches, P35** — Tinadtad/Giniling, Asado, Ham & Cheese, Hungarian (½ sliced)
- **Drinks** — Black Gulaman (10oz P10 / 16oz P25), Lemon Juice P10

### Product images

Drop the photos in `product-images/` using these names, then run one command:

| File | Product |
| --- | --- |
| `giniling.jpg` | Tinadtad / Giniling |
| `asado.jpg` | Asado |
| `ham-cheese.jpg` | Ham & Cheese |
| `hungarian.jpg` | Hungarian (1/2 sliced) |
| `gulaman.jpg` | Black Gulaman |
| `lemon.jpg` | Lemon Juice |

```bash
npm run images:upload
```

It uploads each file to the public `products` bucket and points
`Product.imageUrl` at the resulting URL:

```
https://<project-ref>.supabase.co/storage/v1/object/public/products/asado.jpg
```

Re-running replaces the existing object, so it is safe to use for swaps.
`.jpg`, `.jpeg`, `.png` and `.webp` are all accepted; the folder itself is
gitignored so photos never land in version control.

`next.config.ts` derives the `remotePatterns` entry from
`NEXT_PUBLIC_SUPABASE_URL`, so images pass through `next/image` automatically.
Products without an image fall back to a branded saucer illustration.

---

## 7. AI features

Both run in route handlers with the key server-side only, rate limited per IP
(12 requests / 5 min) through Redis when available:

- **`POST /api/ai/recommend`** — "Ano ang bagay?" The customer types a mood or
  budget in Taglish and gets 2–3 suggestions returned as structured JSON and
  rendered as real add-to-cart cards.
- **`POST /api/ai/parse-order`** — free-text parsing: `"2 asado 1 gulaman
  malaki"` maps to cart lines the customer confirms before adding.

Both use a strict JSON schema and are re-validated against the live menu in
`hydrate()` — anything the model invents is dropped, so the UI can only ever
render real, in-stock products.

Without `OPENAI_API_KEY` the endpoints return `503` and the UI shows a friendly
message; the rest of the site is unaffected.

---

## 8. Redis (optional)

Leave `REDIS_URL` blank and [`src/lib/cache.ts`](src/lib/cache.ts) uses an
in-process Map with identical semantics. Set it and the same helpers use Redis.
A Redis outage degrades to memory rather than taking the site down. Used for
the 5-minute menu cache and the AI rate limiter.

---

## 9. Deploy to Vercel

1. Push to GitHub and import the repo at <https://vercel.com/new>.
2. Add every variable from `.env.example` under Project Settings → Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL (no trailing slash).
4. Add that URL to the Supabase redirect allow-list, and add
   `https://<project-ref>.supabase.co/auth/v1/callback` to both OAuth providers.
5. Deploy. `npm run build` runs `prisma generate` first.
6. Apply migrations against production:
   ```bash
   npm run db:deploy
   ```

---

## 10. Monitoring (Sentry)

Wired but inert. To switch on:

```bash
npm install @sentry/nextjs
```

Then set `NEXT_PUBLIC_SENTRY_ENABLED="true"` plus the DSN, uncomment the
`withSentryConfig` block in [`next.config.ts`](next.config.ts), and forward
from the hooks in [`src/lib/monitoring.ts`](src/lib/monitoring.ts). Call sites
already use `captureException()`, so nothing else changes.

---

## Project structure

```
prisma/
  schema.prisma          Source of truth for the database
  seed.ts                Menu seed (idempotent)
supabase/migrations/     RLS policies + storage bucket (SQL)
src/
  app/
    page.tsx             Home — hero, quick access, AI, bestsellers
    menu/                Category tabs, product cards, bundle upsell
    checkout/            Contact, order type, payment, summary
    orders/[orderNumber] Confirmation + live status tracking
    account/orders/      Signed-in order history
    admin/               Staff kitchen queue with status controls
    location/            Address, map, editable hours, tel link
    login/               Google / Facebook / continue as guest
    track/               Guest order lookup
    auth/callback/       OAuth code exchange + profile upsert
    api/ai/              recommend + parse-order (rate limited)
    api/orders/status/   Status polling for the notification bell
  components/
    ui/                  ShadCN primitives
    brand/               Logo, saucer mark, starburst price badge
    cart/                Provider, sheet drawer, sticky bar, stepper
    menu/ checkout/ admin/ ai/ layout/ location/
  lib/                   currency, cache, env, prisma, supabase, utils
  server/                Server Actions + data access
  proxy.ts               Session refresh + route guards (Next 16 convention)
```

---

## Design notes

- **Mobile-first.** Hamburger → Sheet from the left, centred logo, notification
  bell with unread dot. Quick Access is 4 tiles in one row under the hero.
  Product grid is 1 / 2 / 3 / 4 columns across base / sm / md / lg. Sticky
  bottom cart bar respects iOS safe-area insets. On desktop the hamburger
  becomes a horizontal nav and the cart is a right-side drawer.
- **Touch targets** are at least 44×44px throughout; no hover-only interactions.
- **Accessibility** — labelled controls, alt text, keyboard navigation, visible
  focus rings, `aria-live` on the cart total and order status, and a skip link.
- **Optimistic UI** — cart mutations apply instantly and reconcile against
  `validateCart()`, rolling back to the server's authoritative version when
  prices or availability have moved.
- **Brand tokens** live in the Tailwind v4 `@theme` block in
  [`globals.css`](src/app/globals.css), so ShadCN components inherit the fiery
  orange→red gradient, gold accents and deep navy contrast automatically.

---

## Scripts

| Script                | Purpose                            |
| --------------------- | ---------------------------------- |
| `npm run dev`         | Development server                 |
| `npm run build`       | `prisma generate` + production build |
| `npm run typecheck`   | `tsc --noEmit`                     |
| `npm run lint`        | ESLint                             |
| `npm run db:migrate`  | Create + apply a migration (dev)   |
| `npm run db:deploy`   | Apply migrations (prod/CI)         |
| `npm run db:seed`     | Seed the menu                      |
| `npm run db:studio`   | Prisma Studio                      |

---

Built for **Bossing's Flying Saucer** — Near Pines Memorial, in front of San
Pablo City Water District Complex, San Pablo City, Laguna · 0991 548 1541
