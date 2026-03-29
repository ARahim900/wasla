# Wasla - Property Solutions

## Stack
- React 18 + Vite + Tailwind CSS 3 + Radix UI (shadcn/ui)
- Supabase (auth, database, storage)
- Framer Motion, Recharts, Lucide icons
- PWA with manifest.json, deployed on Vercel (waslapro.vercel.app)

## Design Context

### Users
Wasla serves two distinct user groups with different contexts:
- **Field inspectors** on mobile devices — conducting on-site property walkthroughs, capturing photos, filling inspection reports. They work in variable lighting, often one-handed, and need fast, reliable interactions with minimal friction.
- **Office managers** on desktop — reviewing completed inspections, managing client relationships, generating invoices, and monitoring business metrics from dashboards.

The job to be done: streamline property inspection workflows from field capture to client billing, replacing paper forms and fragmented tools with a single platform.

### Brand Personality
**Modern, Efficient, Bold** — Wasla positions itself as a professional-grade tool that feels premium without being cold. It should communicate competence and authority while remaining approachable.

### Aesthetic Direction
- **Clean & functional** — data-first, decoration-never philosophy.
- **Neutral slate palette** with emerald green (`#059669`) for key brand moments.
- **No box shadows** — separation through background shifts and borders.
- **System fonts** for speed. Radix UI (shadcn/ui) component foundation.
- **Border radius**: `0.375rem` — functional, not bubbly.

### Design Principles
1. **Data first, decoration never** — Every pixel serves the user's task.
2. **Field-ready by default** — Touch targets >= 44px, font >= 16px mobile, high contrast.
3. **Calm confidence** — Neutral tones dominate. Color only for meaning.
4. **Two-context harmony** — Mobile prioritizes capture; desktop prioritizes review.
5. **Accessible by instinct** — WCAG AA floor, safe-area aware, reduced motion respected.
