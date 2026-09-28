import { MetroHero, type TourStop } from "./scroll-locked-video-hero"

// Placeholder tour data: swap in the real states, venues, dates and photos.
// Real photos go in /public/tour/ and are referenced as "/tour/filename.jpg".
// Until then, ph() draws a coloured placeholder so you can see the layout working.
const ph = (label: string, hue: number) =>
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue},55%,38%)"/><stop offset="1" stop-color="hsl(${hue + 40},60%,18%)"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" fill="white" fill-opacity="0.8" font-family="system-ui, sans-serif"
        font-size="56" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>`
    )

const NAMES = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]

const TOUR: TourStop[] = NAMES.map((n, i) => ({
    state: `State ${n}`,
    city: "City",
    venue: "Venue name",
    date: "Month 00, 2026",
    // Odd states get two photos, even states get one, so you can see both layouts.
    images:
        i % 2 === 0
            ? [ph(`State ${n} photo 1`, i * 40), ph(`photo 2`, i * 40 + 180)]
            : [ph(`State ${n} photo`, i * 40)],
}))

export default function Landing() {
    return (
        <main>
            {/* Must be the first thing on the page: it locks scrolling at position 0 */}
            <MetroHero
                title="Garvit - Priyansh India Tour - 2026"
                tagline="Every door in the city is already open."
                stops={TOUR}
                signature={false}
            />
        </main>
    )
}