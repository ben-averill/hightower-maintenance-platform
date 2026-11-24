import type { Colorway } from "./colorways";

// The H glyph from src/scene/hightowerWordmark.ts, painted like the frame.
// public/favicon.svg is the Moss version, shown until the app sets this one.
export function faviconHref({framePaint,frameLogo}:Colorway) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${framePaint}"/><path transform="translate(8.8 7) scale(1.8)" fill="${frameLogo}" d="M0 0H2.2V3.9H5.8V0H8V10H5.8V6.1H2.2V10H0Z"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
