import { useEffect, useRef, useState } from "react"
import type { CSSProperties, MouseEvent } from "react"

// ─────────────────────────────────────────────────────────────
// Locked scroll-scrub video hero + tour chapters
//
// Timeline (in "units", driven by wheel / touch):
//   0 → 1          video scrubs, title blurs out, tagline blurs in
//   1 → 1 + N      one unit per tour stop: fade + image reveal
// After the last stop, pushing forward unlocks the page.
// Scrolling back up at the top re-locks and plays it in reverse.
// Place it as the FIRST section of the page.
// ─────────────────────────────────────────────────────────────

export interface TourStop {
    state: string
    city?: string
    venue?: string
    date?: string
    /** 1 or 2 image URLs */
    images: string[]
}

export interface MetroHeroProps {
    videoSrc?: string
    title?: string
    scrollHint?: string
    tagline?: string
    signature?: { name: string; url: string } | false
    /** Tour chapters shown after the video. Leave empty for the video-only hero. */
    stops?: TourStop[]
    /** Input distance (px) to scrub the full video. */
    scrubDistance?: number
    /** Input distance (px) per tour stop. */
    stopDistance?: number
    /** Unlock the page after the last chapter. */
    releaseAtEnd?: boolean
    className?: string
    style?: CSSProperties
}

const DEFAULT_VIDEO =
    "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4"
const DEFAULT_SIGNATURE = { name: "guglielmogiannattasio.exe", url: "https://www.guglielmogiannattasio.it" }
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const COL_BG = "#05070d"
const COL_TEXT = "#f2f4f8"
const COL_MUTED = "rgba(220,224,232,0.68)"

function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v))
}
const pad = (n: number) => String(n).padStart(2, "0")

export function MetroHero({
    videoSrc = DEFAULT_VIDEO,
    title = "THE CITY OPENS",
    scrollHint = "SCROLL",
    tagline = "Every door in the city is already open.",
    signature = DEFAULT_SIGNATURE,
    stops = [],
    scrubDistance = 3200,
    stopDistance = 1400,
    releaseAtEnd = true,
    className,
    style,
}: MetroHeroProps) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const dimRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)
    const hintRef = useRef<HTMLDivElement>(null)
    const taglineRef = useRef<HTMLDivElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)
    const stopRefs = useRef<(HTMLDivElement | null)[]>([])
    const [ready, setReady] = useState(false)
    const [isWide, setIsWide] = useState(false)

    // Side-by-side layout from 768px up; stacked on phones. No external CSS needed.
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)")
        const update = () => setIsWide(mq.matches)
        update()
        mq.addEventListener("change", update)
        return () => mq.removeEventListener("change", update)
    }, [])

    const stopCount = stops.length

    useEffect(() => {
        const video = videoRef.current
        const section = sectionRef.current
        if (!video || !section) return

        // Reduced motion: keep the scrub (it's user-driven) but drop zoom, blur and parallax.
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

        const TOTAL = 1 + stopCount
        const layers = stopRefs.current.slice(0, stopCount).map((root) => ({
            root,
            text: root?.querySelector<HTMLElement>("[data-text]") ?? null,
            a: root?.querySelector<HTMLElement>("[data-img='a']") ?? null,
            b: root?.querySelector<HTMLElement>("[data-img='b']") ?? null,
        }))

        let duration = 0
        let rafId = 0
        let target = 0
        let current = 0
        let hasStartedScrolling = false
        let isSeeking = false
        let pendingTime: number | null = null
        let lastSeek = -1
        let locked = false
        let lockedScrollY = 0
        let touchStartY = 0

        const onLoadedData = () => {
            duration = video.duration || 0
            setReady(true)
        }
        video.addEventListener("loadeddata", onLoadedData)

        // iOS Safari may not buffer until playback starts; silent play-then-pause kicks it off.
        const p = video.play()
        if (p && typeof p.then === "function") p.then(() => video.pause()).catch(() => { })
        else video.pause()

        const onSeeked = () => {
            isSeeking = false
            if (pendingTime !== null) {
                const t = pendingTime
                pendingTime = null
                isSeeking = true
                video.currentTime = t
            }
        }
        video.addEventListener("seeked", onSeeked)

        function seekTo(t: number) {
            if (Math.abs(t - lastSeek) < 0.001) return
            lastSeek = t
            if (isSeeking) {
                pendingTime = t
                return
            }
            isSeeking = true
            video!.currentTime = t
        }

        function engageLock() {
            if (locked) return
            locked = true
            lockedScrollY = window.scrollY
            const b = document.body.style
            b.position = "fixed"
            b.top = `-${lockedScrollY}px`
            b.left = "0"
            b.right = "0"
            b.width = "100%"
            b.height = "100%"
            b.overscrollBehavior = "none"
            section!.style.touchAction = "none"
        }

        function releaseLock() {
            if (!locked) return
            locked = false
            const b = document.body.style
            b.position = ""
            b.top = ""
            b.left = ""
            b.right = ""
            b.width = ""
            b.height = ""
            b.overscrollBehavior = ""
            section!.style.touchAction = "pan-y"
            window.scrollTo(0, lockedScrollY)
        }

        engageLock()

        /** Returns true if the input was consumed by the scrub. */
        function handleDelta(deltaY: number): boolean {
            if (!locked) {
                const top = section!.getBoundingClientRect().top
                if (deltaY < 0 && top >= -1) engageLock()
                else return false
            }

            if (releaseAtEnd && deltaY > 0 && target >= TOTAL && current > TOTAL - 0.005) {
                releaseLock()
                return false
            }

            // Video phase and chapter phase can have different "speeds".
            const rate = target < 1 ? 1 / scrubDistance : 1 / stopDistance
            target = clamp(target + deltaY * rate, 0, TOTAL)
            if (target > 0.001) hasStartedScrolling = true
            return true
        }

        const onWheel = (e: WheelEvent) => {
            if (handleDelta(e.deltaY)) e.preventDefault()
        }
        const onTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0]?.clientY ?? 0
        }
        const onTouchMove = (e: TouchEvent) => {
            const y = e.touches[0]?.clientY ?? touchStartY
            const deltaY = touchStartY - y
            touchStartY = y
            if (handleDelta(deltaY * 1.4)) e.preventDefault()
        }

        window.addEventListener("wheel", onWheel, { passive: false })
        window.addEventListener("touchstart", onTouchStart, { passive: true })
        window.addEventListener("touchmove", onTouchMove, { passive: false })
        section.addEventListener("touchstart", onTouchStart, { passive: true, capture: true })
        section.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })

        function frame() {
            current += (target - current) * 0.16
            if (Math.abs(target - current) < 0.0005) current = target

            const v = clamp(current, 0, 1) // video phase
            const beyond = current - 1 // how far into the chapters

            if (duration > 0) seekTo(v * duration)

            if (videoRef.current && !reduceMotion) {
                videoRef.current.style.transform = `scale(${1 + v * 0.06 + clamp(beyond, 0, TOTAL) * 0.01})`
            }

            // Darken the (frozen) last frame so chapters read clearly on top of it.
            if (dimRef.current) {
                dimRef.current.style.opacity = String(clamp(beyond / 0.5, 0, 1) * 0.72)
            }

            if (titleRef.current) {
                const t = 1 - clamp(v / 0.35, 0, 1)
                titleRef.current.style.opacity = String(t)
                if (!reduceMotion) {
                    titleRef.current.style.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`
                    titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`
                }
            }

            if (hintRef.current) {
                hintRef.current.style.opacity = hasStartedScrolling ? "0" : "1"
            }

            if (taglineRef.current) {
                const tin = clamp((v - 0.82) / 0.18, 0, 1)
                const tout = stopCount ? clamp(beyond / 0.3, 0, 1) : 0
                const t = tin * (1 - tout)
                taglineRef.current.style.opacity = String(t)
                if (!reduceMotion) {
                    taglineRef.current.style.transform = `translateY(${(1 - tin) * 20 - tout * 30}px) scale(${0.97 + tin * 0.03})`
                    taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`
                }
            }

            // Chapters: each owns one unit [i, i+1] of the "beyond" range.
            layers.forEach(({ root, text, a, b }, i) => {
                if (!root) return
                const l = beyond - i
                const isLast = i === stopCount - 1
                const inT = clamp((l - 0.05) / 0.3, 0, 1)
                const outT = isLast ? 0 : clamp((l - 0.72) / 0.28, 0, 1)
                const vis = inT * (1 - outT)

                root.style.opacity = String(vis)
                root.style.visibility = vis > 0.001 ? "visible" : "hidden"

                if (text) {
                    text.style.transform = reduceMotion ? "" : `translateY(${(1 - inT) * 40 - outT * 40}px)`
                }
                const drift = clamp(l, 0, 1) - 0.5 // -0.5 → 0.5 across the chapter
                if (a) {
                    a.style.clipPath = `inset(${(1 - inT) * 100}% 0 0 0)`
                    if (!reduceMotion) a.style.transform = `translateY(${-drift * 50}px) scale(${1.08 - inT * 0.08})`
                }
                if (b) {
                    const inB = clamp((l - 0.15) / 0.3, 0, 1)
                    b.style.clipPath = `inset(0 0 ${(1 - inB) * 100}% 0)`
                    if (!reduceMotion) b.style.transform = `translateY(${-drift * 110}px)`
                }
            })

            if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${current / TOTAL})`
            }

            rafId = requestAnimationFrame(frame)
        }
        rafId = requestAnimationFrame(frame)

        return () => {
            video.removeEventListener("loadeddata", onLoadedData)
            video.removeEventListener("seeked", onSeeked)
            window.removeEventListener("wheel", onWheel)
            window.removeEventListener("touchstart", onTouchStart)
            window.removeEventListener("touchmove", onTouchMove)
            section.removeEventListener("touchstart", onTouchStart, true)
            section.removeEventListener("touchmove", onTouchMove, true)
            cancelAnimationFrame(rafId)
            releaseLock()
        }
    }, [scrubDistance, stopDistance, releaseAtEnd, stopCount])

    const TOTAL = 1 + stopCount

    return (
        <div
            ref={sectionRef}
            className={className}
            style={{
                position: "relative",
                width: "100vw",
                height: "100dvh",
                minHeight: "100vh",
                left: "50%",
                marginLeft: "-50vw",
                marginRight: "-50vw",
                overflow: "hidden",
                background: COL_BG,
                touchAction: "none",
                ...style,
            }}
        >
            <video
                ref={videoRef}
                src={videoSrc}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: ready ? 1 : 0,
                    transformOrigin: "center center",
                    willChange: "transform",
                    transition: "opacity 0.6s ease",
                    pointerEvents: "none",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(180deg, rgba(5,7,13,0.35), rgba(5,7,13,0) 30%, rgba(5,7,13,0.15) 70%, rgba(5,7,13,0.55))",
                    pointerEvents: "none",
                }}
            />

            {/* Darkens the video once the tour chapters begin */}
            <div
                ref={dimRef}
                style={{ position: "absolute", inset: 0, background: COL_BG, opacity: 0, pointerEvents: "none" }}
            />

            <div
                ref={titleRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 6%",
                    textAlign: "center",
                    pointerEvents: "none",
                }}
            >
                <h1
                    style={{
                        margin: 0,
                        fontFamily: SANS,
                        fontWeight: 800,
                        fontSize: "clamp(30px, 7vw, 96px)",
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                        color: COL_TEXT,
                        textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                        display: "inline-block",
                        willChange: "transform, filter, opacity",
                    }}
                >
                    {title}
                </h1>
            </div>

            {tagline && (
                <div
                    ref={taglineRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 8%",
                        textAlign: "center",
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontFamily: SANS,
                            fontWeight: 700,
                            fontSize: "clamp(20px, 3.4vw, 40px)",
                            lineHeight: 1.2,
                            letterSpacing: "-0.01em",
                            color: COL_TEXT,
                            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
                        }}
                    >
                        {tagline}
                    </p>
                </div>
            )}

            {/* ── Tour chapters ─────────────────────────────────── */}
            {stops.map((s, i) => {
                const [imgA, imgB] = s.images
                return (
                    <div
                        key={`${s.state}-${i}`}
                        ref={(el) => {
                            stopRefs.current[i] = el
                        }}
                        aria-hidden={false}
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 3,
                            display: "flex",
                            flexDirection: isWide ? "row" : "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: isWide ? "6%" : 24,
                            padding: isWide ? "0 8%" : "0 24px",
                            boxSizing: "border-box",
                            textAlign: "left",
                            opacity: 0,
                            visibility: "hidden",
                            pointerEvents: "none",
                            fontFamily: SANS,
                        }}
                    >
                        <div data-text style={{ width: isWide ? "38%" : "100%", willChange: "transform" }}>
                            <p
                                style={{
                                    margin: 0,
                                    color: COL_MUTED,
                                    fontSize: "clamp(13px, 1.3vw, 15px)",
                                    fontWeight: 600,
                                    fontVariantNumeric: "tabular-nums",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {pad(i + 1)} / {pad(stopCount)}
                            </p>
                            <h2
                                style={{
                                    margin: "0.2em 0 0",
                                    color: COL_TEXT,
                                    fontWeight: 800,
                                    fontSize: "clamp(40px, 7.5vw, 112px)",
                                    lineHeight: 0.95,
                                    letterSpacing: "-0.03em",
                                }}
                            >
                                {s.state}
                            </h2>
                            {s.city && (
                                <p style={{ margin: "0.8em 0 0", color: COL_TEXT, fontSize: "clamp(17px, 1.8vw, 22px)", fontWeight: 600 }}>
                                    {s.city}
                                </p>
                            )}
                            {(s.venue || s.date) && (
                                <p style={{ margin: "0.3em 0 0", color: COL_MUTED, fontSize: "clamp(14px, 1.4vw, 17px)", lineHeight: 1.5 }}>
                                    {s.venue}
                                    {s.venue && s.date && <br />}
                                    {s.date}
                                </p>
                            )}
                        </div>

                        <div
                            style={{
                                position: "relative",
                                width: isWide ? "48%" : "100%",
                                maxWidth: isWide ? "none" : 560,
                                aspectRatio: isWide ? "5 / 4" : "4 / 3",
                                flexShrink: 0,
                            }}
                        >
                            {imgA && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    data-img="a"
                                    src={imgA}
                                    alt={`${s.state}${s.city ? `, ${s.city}` : ""}`}
                                    decoding="async"
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        width: imgB ? "74%" : "100%",
                                        height: imgB ? "80%" : "100%",
                                        objectFit: "cover",
                                        borderRadius: 4,
                                        clipPath: "inset(100% 0 0 0)",
                                        willChange: "transform, clip-path",
                                    }}
                                />
                            )}
                            {imgB && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    data-img="b"
                                    src={imgB}
                                    alt=""
                                    decoding="async"
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        bottom: 0,
                                        width: "50%",
                                        height: "54%",
                                        objectFit: "cover",
                                        borderRadius: 4,
                                        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                                        outline: `6px solid ${COL_BG}`,
                                        clipPath: "inset(0 0 100% 0)",
                                        willChange: "transform, clip-path",
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
            })}

            <div
                ref={hintRef}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "clamp(20px, 6vh, 48px)",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    color: "rgba(240,244,248,0.75)",
                    fontFamily: SANS,
                    fontSize: "clamp(10px, 1.4vw, 12px)",
                    fontWeight: 600,
                    letterSpacing: "0.3em",
                    transition: "opacity 0.4s ease",
                    pointerEvents: "none",
                }}
            >
                <span>{scrollHint}</span>
                <svg width="14" height="18" viewBox="0 0 14 18" style={{ animation: "metro-hero-bounce 1.6s ease-in-out infinite" }}>
                    <style>{`
            @keyframes metro-hero-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.5; }
              50% { transform: translateY(5px); opacity: 1; }
            }
          `}</style>
                    <path d="M7 1 L7 17 M2 12 L7 17 L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Progress line, with a tick where each chapter begins */}
            <div
                aria-hidden="true"
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,0.12)" }}
            >
                <div
                    ref={progressBarRef}
                    style={{
                        height: "100%",
                        width: "100%",
                        background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.95))",
                        transform: "scaleX(0)",
                        transformOrigin: "left center",
                    }}
                />
                {stops.map((_, i) => (
                    <span
                        key={i}
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: `${((1 + i) / TOTAL) * 100}%`,
                            width: 1,
                            height: 8,
                            background: "rgba(255,255,255,0.45)",
                        }}
                    />
                ))}
            </div>

            {signature && (
                <span
                    style={{
                        position: "absolute",
                        right: "clamp(12px, 2.5vw, 24px)",
                        bottom: "clamp(10px, 2vw, 18px)",
                        fontFamily: SANS,
                        fontWeight: 500,
                        fontSize: "clamp(11px, 1.4vw, 13px)",
                        letterSpacing: "0.01em",
                        color: "rgba(220,224,232,0.6)",
                        zIndex: 2,
                    }}
                >
                    by{" "}
                    <a
                        href={signature.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "rgba(220,224,232,0.6)", textDecoration: "none", transition: "color 0.2s ease" }}
                        onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
                            e.currentTarget.style.color = COL_TEXT
                        }}
                        onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
                            e.currentTarget.style.color = "rgba(220,224,232,0.6)"
                        }}
                    >
                        {signature.name}
                    </a>
                </span>
            )}
        </div>
    )
}

export default MetroHero