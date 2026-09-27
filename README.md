# Bistro

An ordering site for a restaurant, and the internal panel the staff run it from.

Guests filter the menu, build an order with extras, and choose pickup or delivery.
The owner signs in to a separate panel to change prices, mark dishes sold out, and
watch orders arrive. It is the kind of small internal tool a restaurant would
otherwise pay a monthly subscription for.

**React (Next.js) · Node.js REST API (Express) · PostgreSQL (Prisma) · Docker · PayPal**

---

## Run it

One command, from nothing:

```bash
docker compose up --build
```

- Site — <http://localhost:3000>
- API — <http://localhost:4000/api/menu>
- Staff panel — <http://localhost:3000/admin> · `owner@bistro.local` / `local-dev-password`

Compose starts Postgres, waits until it is genuinely accepting queries, applies the
migrations, seeds a twelve-dish menu, then starts the API and the site. Nothing is
sequenced with `sleep`.

<details>
<summary>Running from source instead</summary>

```bash
npm install
docker compose up -d db                      # Postgres only
cp apps/api/.env.example apps/api/.env       # then fill it in
npm run db:migrate --workspace @bistro/api
npm run db:seed --workspace @bistro/api

npm run dev --workspace @bistro/api          # localhost:4000
npm run dev --workspace @bistro/web          # localhost:3000
```

</details>

---

## How it fits together

```
                 browser
                    │
        ┌───────────┴────────────┐
        │  Next.js  (apps/web)   │
        │                        │
        │  server components     │──── reads the menu, server-side
        │  server actions        │──── staff edits, with the bearer token
        │  /api/* rewrite        │──── proxies the public endpoints
        │  session cookie        │──── httpOnly, this origin only
        └───────────┬────────────┘
                    │  Authorization: Bearer …
        ┌───────────┴────────────┐
        │  Express  (apps/api)   │
        │                        │
        │  services/pricing.ts   │──── the only place a total is computed
        │  requireStaff          │──── every /api/admin route
        └───────────┬────────────┘
                    │  Prisma
              ┌─────┴─────┐
              │ PostgreSQL │
              └───────────┘

 packages/shared — money formatting, request schemas, pricing, status rules.
                   Imported by both sides so they cannot drift apart.
```

---

## What it does

**Menu with filters.** Course and dietary filters combine, in the browser, with no
reload. The page itself is server-rendered, so the whole menu is in the HTML for
search engines before any JavaScript runs.

**Cart with options.** Add and remove dishes, change quantities, and pick extras —
"no onion" is a free choice, "large" adds to the price. Both are the same shape in
the data model, so the pricing code has no special cases. The same dish ordered two
different ways stays two lines, the way a till behaves.

**Checkout.** Pickup or delivery, with an address when it is delivery, and a
requested time validated against the kitchen's lead time. Payment goes through
PayPal: the guest leaves for PayPal's own page and comes back, and a signed webhook
— not the browser — is what marks the order paid. The confirmation page is reachable
by a random token rather than an order number, so nobody can read the
neighbourhood's dinner by counting upwards.

**Staff panel.** Sign in, edit a price, mark a dish sold out, and watch the order
queue fill in. Tickets move through the kitchen — start cooking, ready, complete —
and every move is recorded with who made it.

---

## Decisions worth explaining

**The client never sends a price.** The request schema has no price field at all, and
Zod strips unknown keys, so one cannot be smuggled in. `services/pricing.ts` reads
every dish price and option delta from the database using the ids the browser sent.
A payload claiming a total of one cent is charged the real amount.

**Money is always an integer of minor units.** `priceCents`, never a float, never a
`Decimal`. Tax is basis points — `825` is 8.25% — so the arithmetic never leaves the
integers. PayPal is the one thing that wants a decimal string, and that conversion
happens at its boundary, built by string surgery rather than dividing by 100, so no
float touches an amount even there.

**Order lines carry snapshots.** Each line stores the name and price it was bought
at. The owner edits prices daily; without snapshots a price change would quietly
rewrite past receipts. Doubling a dish's price leaves an existing order's total
exactly where it was and charges the new price on the next one.

**One pricing function, two callers.** The arithmetic lives in `packages/shared`. The
browser feeds it menu prices to show a running total; the API feeds it database
prices to compute what gets charged. One implementation, so the number on screen
cannot disagree with the number on the card.

**The API is bearer-only; the cookie belongs to the web app.** The API never sets a
cookie. The site exchanges the password for a token at its own route and stores it in
an httpOnly cookie on its own origin, then attaches it server-side. The token never
exists in client JavaScript, there is no cross-site cookie, no `SameSite=None`, and
no CORS-with-credentials — and the API is still usable with `curl` and a token.

**The proxy is not the security boundary.** `proxy.ts` redirects visitors without a
cookie to the sign-in page. That is all it does. It cannot verify a token, so a
forged cookie walks straight past it and is rejected by the API, which re-reads the
staff member from the database on every request — so deactivating an account ends a
live session immediately rather than whenever the token expires.

**Only the payment processor may say something was paid.** `PAID`, `PAYMENT_FAILED`
and `REFUNDED` are refused from the panel with a 403 no matter who asks. Payment is
tracked beside the workflow status, not folded into it, so a ticket can be cooking
while payment is still due on collection.

**PayPal rather than Stripe, because the restaurant is in Honduras.** Stripe does not
operate there — in Latin America it supports Brazil and Mexico only — so the usual
choice was not available. The shape of the integration is the same: the payer leaves
for a hosted page, comes back, and a signed webhook is the only thing permitted to
report that money moved. PayPal's version is slightly harder in a useful way, below.
It is integrated over `fetch` rather than `@paypal/paypal-server-sdk`: the whole thing
is three endpoints, the SDK brings axios plus five packages to wrap them, and it
cannot verify a webhook anyway.

**The signature is verified locally, and the certificate URL is the real problem.**
PayPal signs `transmissionId|time|webhookId|crc32(rawBody)` with SHA256-RSA — against
a certificate whose URL arrives *in a header the sender controls*. Fetch that URL
blindly and the scheme is worthless: an attacker signs any body with their own key,
points the header at their own certificate, and has just told the kitchen that an
unpaid order was paid. So the host is checked against PayPal's domains before the
fetch, by `URL.hostname` rather than a substring — `includes("paypal.com")` would
accept `evil-paypal.com.attacker.tld`, and a raw string match would accept
`https://api.paypal.com@evil.tld`. Verification is done locally rather than by
posting the event back to PayPal for three reasons: postback cannot verify anything
while PayPal is unreachable, which is exactly when retries are piling up; it does not
work with their webhook simulator at all; and it costs a round trip per delivery.

**The capture happens on the webhook, not when the browser returns.** A tab closed
after approving would otherwise leave the payment authorised and never taken. The
HTTP call to PayPal is deliberately outside the database transaction — a network round
trip inside one holds a connection for its whole duration — which is safe because the
capture is idempotent twice over: `PayPal-Request-Id` on their side, and
`ORDER_ALREADY_CAPTURED` treated as success on ours.

**A redelivered webhook is a no-op, and the ordering of that is the whole trick.**
PayPal retries on any non-2xx and redelivers on its own schedule. The event id has a
unique constraint, and that insert shares one transaction with the status change.
Recording the event first in its own transaction would mark as seen an event that was
never applied, and the retry that was supposed to save us would skip it. A unique
violation means "already applied, reply 200"; a failure halfway rolls the marker back
so the retry still has work to do.

**A webhook never rewinds a ticket.** A pickup order can legitimately be `IN_KITCHEN`
before the money lands, because the kitchen starts cooking something that will be paid
on collection. So the payment facts and the workflow status are decided separately:
`paidAt` and the capture id are always recorded, and the status moves only when moving
it means something. Money arriving for an order somebody already cancelled records the
capture — so it can be refunded — leaves the status alone, and logs loudly, because
that one needs a person rather than a state transition.

**No PayPal credentials is a supported state, not a broken one.** With none set the API
still boots, orders are still placed, and they arrive as `PENDING_PAYMENT` payable on
collection — which is how the restaurant works anyway. The same path covers PayPal
being down: the order survives, the sale is not lost. An empty environment variable
counts as unset, because `${PAYPAL_CLIENT_ID:-}` in compose and an unfilled field in
the Render dashboard both produce `""`, and `z.string().min(1).optional()` rejects that
— `optional()` permits `undefined`, not empty.

---

## Layout

```
apps/web         Next.js 16, React 19, Tailwind v4
  src/app/(site) the public site — a route group, so the panel does not
                 inherit the navbar, footer, cart and WhatsApp button
  src/app/admin  the staff panel
  src/proxy.ts   the /admin redirect (Next 16 renamed middleware.ts to proxy.ts)

apps/api         Express 5, Prisma 6
  src/services/  pricing and settings — where the money decisions live
  prisma/        schema, migrations, and the seed that ports the menu

packages/shared  money, menu types, pricing, cart identity, order schemas,
                 status transition rules
```

---

## Deployment

| Piece | Where | Note |
|---|---|---|
| Database | Neon | free tier |
| API | Render, **built from `apps/api/Dockerfile`** | free tier |
| Site | Vercel, root directory `apps/web` | |

The API image is the artifact that actually gets deployed, which is what keeps the
Docker setup from being decorative.

The staff credentials shown further up are compose-only. There is no default password
anywhere in the repository: the seed reads `SEED_ADMIN_PASSWORD` and refuses to run if
it is unset or shorter than twelve characters, so a deployment has to choose its own.

**The API sleeps.** On the free tier it spins down when idle, so the first request
after a quiet spell can take around a minute. The site handles this rather than
breaking: a failed menu fetch renders an explicit "just waking up" panel and recovers
on the next revalidation, so a cold backend never turns into a failed build or a
blank page. Moving to a paid instance fixes it without touching any code.

Two environment variables are easy to get wrong, both because they are needed at
**build** time, not just at runtime:

- `NEXT_PUBLIC_SITE_URL` is inlined into the browser bundle. Set only at runtime, the
  canonical URLs keep whatever was baked in.
- `API_INTERNAL_URL` is compiled into `routes-manifest.json`, because Next resolves
  rewrite destinations at build time. Set only at runtime, every proxied API call
  fails while the API sits there perfectly healthy.

**The PayPal webhook is pointed straight at the API's own URL**, never at the site's
`/api/*` proxy. A proxy hop can alter the bytes the signature was computed over, and
PayPal's documentation is explicit that the original raw body is what gets hashed. Its
signing id goes in `PAYPAL_WEBHOOK_ID` — which is part of the signed message, so a
wrong value fails every delivery with nothing to distinguish it from a forgery. PayPal
cannot deliver to `localhost`, so local testing needs a tunnel
(`cloudflared tunnel --url http://localhost:4000`) registered as the webhook URL.

Migrations are applied with `npm run db:deploy --workspace @bistro/api` pointed at
the production `DIRECT_URL` — unpooled, because Prisma Migrate cannot run through a
transaction pooler. The runtime image deliberately does not carry the Prisma CLI; see
[SECURITY-NOTES.md](SECURITY-NOTES.md).

---

## Not finished

- **A live PayPal account.** The integration runs against the sandbox. Going live is
  a matter of credentials and `PAYPAL_ENV=live`, with no code change — that switch is
  read from its own variable rather than inferred from `NODE_ENV`, because a staging
  deploy runs `NODE_ENV=production` against the sandbox and guessing that wrong means
  taking real money in a test.
- **Refunds cannot be issued from the panel.** A refund arriving from PayPal is
  handled and moves the order to `REFUNDED`; starting one is still done in PayPal's
  own dashboard. The capture id is stored on every paid order precisely so that it
  can be, including on the awkward orders — money that arrived for something already
  cancelled keeps its capture id for exactly this reason.
- **The order feed polls** every five seconds. Server-sent events would be tidier;
  polling is honest about what it is and was the right first version.
- **No automated test suite.** Behaviour was verified by exercising the running
  stack — the pricing, cart and filter logic against live data, every route against a
  real database, and the webhook signature against a generated keypair including the
  forged-certificate cases. Those checks deserve to be a test suite rather than a
  record in the commit history.

---

## Licence

MIT
