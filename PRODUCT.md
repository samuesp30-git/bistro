# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 + Tailwind CSS v4 (TypeScript). No animation library: the one authored entrance and every state change are CSS.

## Users

Restaurant guests seeking fine dining experiences. Primary job: discover the menu, learn about the restaurant, and make a reservation via WhatsApp or contact form.

## Product Purpose

A restaurant website that communicates culinary artistry and elegance, drives reservations, and showcases the menu, ambiance, and story of Bistro.

## Positioning

French-inspired bistro with Michelin-star pedigree (Chef Antoine Moreau, 22+ years, 2 Michelin stars) at an intimate neighborhood scale. The differentiator is the combination of high culinary craft with genuine warmth — not a stiff fine-dining formality, but a place where "every meal becomes a memory."

## Operating Context

Guests browse on mobile and desktop, typically in evening hours or planning ahead. Key workflows: browse menu → view gallery → make reservation via WhatsApp. Print menu available via QR code for in-restaurant use.

## Capabilities and Constraints

- 6 pages: Home, Menu, Menu/Scan (printable QR), Gallery, About, Contact
- WhatsApp integration for reservations (floating button + CTA)
- Contact form with reservation details
- Category-filtered menu with 12 items across 4 categories
- Masonry gallery with lightbox
- All images from Unsplash (stock photography)
- No CMS — all content hardcoded in `src/data/restaurant.ts`
- No authentication, no e-commerce, no delivery integration

## Brand Commitments

- Name: "Bistro"
- Tagline: "Where Every Meal Becomes a Memory"
- Voice: Warm, refined, inviting — never pretentious
- Color palette: Cream (#faf8f5), Gold (#c9a96e), Terracotta (#c4724e), Charcoal (#1a1a2e)
- Brand gold is a surface, fill and ornament colour, never small text: it reads
  at 2.1:1 on cream. Text uses the ink tokens derived from the four values in
  `globals.css` (`--gold-ink`, `--ink-soft`, `--on-dark-soft`, and the rest),
  which all clear WCAG AA. Do not set body copy in `--gold` or in an alpha of
  charcoal, which renders as a neutral gray.
- Typography: Inter (sans-serif body) + Cormorant Garamond (display headings)

## Evidence on Hand

- Full working codebase at `/mnt/c/Users/Darwin/Restaurant/`
- 12 menu items with descriptions, prices, categories, and Unsplash images
- 3 testimonials with real-feeling quotes and avatars
- 12 gallery images across Interior/Food/Drinks categories
- Chef bio and stats
- All content in `src/data/restaurant.ts`

## Product Principles

1. Every page should feel like entering a warm, candlelit room — inviting, not intimidating
2. The food is the hero — imagery and descriptions must do the heavy lifting
3. Reservation must be frictionless — WhatsApp one tap away on every page
4. Mobile-first — most guests will discover us on their phones
5. Elegant restraint — let the content breathe, never clutter

## Accessibility & Inclusion

No specific requirements established. Standard web accessibility best practices apply.
