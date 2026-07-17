// Single source of truth for the Wasla wordmark/logo.
//
// This still points at an external Base44 storage bucket the team does not
// control. Centralizing it here removes the duplication (it was copy-pasted
// across the layout, login, reset-password and report templates) and makes
// self-hosting a one-line change: drop the image into `public/` (e.g.
// `public/logo.png`) and set LOGO_URL to `/logo.png`.
export const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png";
