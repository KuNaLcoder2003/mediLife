import { useRef, useState } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useSpring,
    useReducedMotion,
    useMotionValueEvent,
    type Variants,
} from "framer-motion";
import "./TheRootStory.css";
import heroImage from "../assets/hero_root.webp";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Category = "creamy" | "crunchy" | "flavoured";

interface Product {
    id: string;
    cat: Category;
    name: string;
    note: string;
    size: string;
    price: number;
    rating: number;
    tag: string;
    img: string;
}

// Sample Unsplash photos — swap the IDs for your own product shots.
const unsplash = (id: string, w = 700): string =>
    `https://unsplash.com/photos/${id}/download?w=${w}`;

const PRODUCTS: Product[] = [
    { id: "classic-creamy", cat: "creamy", name: "Classic Creamy", note: "Peanuts + rock salt. That's it.", size: "340g", price: 349, rating: 4.9, tag: "Bestseller", img: "https://therootstory.in/cdn/shop/files/PRDUCT_PHOTO_7_copy_2.png?v=1770917809&width=600" },
    { id: "unsalted-smooth", cat: "creamy", name: "Unsalted Smooth", note: "Pure roasted peanut, nothing more.", size: "340g", price: 329, rating: 4.7, tag: "No salt", img: "https://therootstory.in/cdn/shop/files/PRDUCT_PHOTO_10.png?v=1770917759&width=1946" },
    { id: "honey-drizzle", cat: "creamy", name: "Honey Drizzle", note: "Wild forest honey folded in.", size: "340g", price: 399, rating: 4.8, tag: "New", img: "https://therootstory.in/cdn/shop/files/PRDUCT_PHOTO_12_copy_5.png?v=1771439668&width=1946" },
    { id: "chunky-classic", cat: "crunchy", name: "Chunky Classic", note: "Big roasted bits in every spoon.", size: "340g", price: 349, rating: 4.8, tag: "Bestseller", img: unsplash("u256GzFi7Gw") },
    { id: "jaggery-crunch", cat: "crunchy", name: "Jaggery Crunch", note: "Sweetened with desi jaggery.", size: "340g", price: 379, rating: 4.9, tag: "Favourite", img: unsplash("7m-aAY8fLrE") },
    { id: "sea-salt-crunch", cat: "crunchy", name: "Sea Salt Crunch", note: "Flaky salt, extra-dark roast.", size: "340g", price: 369, rating: 4.6, tag: "Bold", img: unsplash("RUqCyjDQZ-A") },
    { id: "dark-cocoa", cat: "flavoured", name: "Dark Cocoa", note: "70% cocoa, low sugar.", size: "340g", price: 429, rating: 4.9, tag: "Favourite", img: unsplash("4bplAb9rLG8") },
    { id: "cinnamon-maple", cat: "flavoured", name: "Cinnamon Maple", note: "Warm spice, a little maple.", size: "340g", price: 419, rating: 4.7, tag: "Seasonal", img: unsplash("68sCn9bY0PY") },
    { id: "coffee-crunch", cat: "flavoured", name: "Coffee Crunch", note: "Ground arabica, crunchy bits.", size: "340g", price: 439, rating: 4.8, tag: "New", img: unsplash("RUqCyjDQZ-A") },
];

const TABS: { id: Category; label: string }[] = [
    { id: "creamy", label: "Creamy" },
    { id: "crunchy", label: "Crunchy" },
    { id: "flavoured", label: "Flavoured" },
];

/* ------------------------------------------------------------------ */
/* Small SVG pieces                                                    */
/* ------------------------------------------------------------------ */

function Logo() {
    return (
        <a className="rs-logo" href="#" aria-label="The Root Story home">
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="23" fill="#D8892B" />
                <path d="M24 9c6 0 10 4.5 10 10 0 3.5-2.4 5.5-2.4 9s2.4 5 2.4 8.5c0 5-4.2 8-10 8s-10-3-10-8c0-3.5 2.4-5 2.4-8.5S14 22.5 14 19c0-5.5 4-10 10-10Z" fill="#FBF6EC" />
                <path d="M24 44v-8M24 36c-3-1-5-3-6-6M24 36c3-1 5-3 6-6" stroke="#5B2D12" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <span>
                <small>THE</small>ROOT STORY
            </span>
        </a>
    );
}

const Star = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
);

const Arrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

/* ------------------------------------------------------------------ */
/* Nav — condenses once you scroll past the top                        */
/* ------------------------------------------------------------------ */

function Nav() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);

    useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

    return (
        <header className={`rs-nav${scrolled ? " is-scrolled" : ""}`}>
            <div className="rs-nav-inner">
                <nav className="rs-nav-links" aria-label="Primary">
                    <a href="#">Our story</a>
                    <a href="#">Recipes</a>
                    <a href="#shop">Shop</a>
                </nav>
                <Logo />
                <a className="rs-btn" href="#shop">SHOP NOW</a>
            </div>
        </header>
    );
}

/* ------------------------------------------------------------------ */
/* Hero — scroll-linked parallax on the product shot                                       */
/* ------------------------------------------------------------------ */

function Hero() {
    const ref = useRef<HTMLElement>(null);
    const reduce = useReducedMotion() ?? false;

    // 0 when the hero top hits the viewport top, 1 when the hero has scrolled out
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

    // Headline drifts up, its lines spread apart and it fades
    const line1X = useTransform(p, [0, 1], ["0%", "-12%"]);
    const line2X = useTransform(p, [0, 1], ["0%", "12%"]);
    const headlineY = useTransform(p, [0, 1], [0, -140]);
    const headlineOpacity = useTransform(p, [0, 0.55], [1, 0]);

    // The jar shot rises, pushes toward the viewer and tilts a touch
    const imgY = useTransform(p, [0, 1], [0, -220]);
    const imgScale = useTransform(p, [0, 1], [1, 1.22]);
    const imgRotate = useTransform(p, [0, 1], [0, -3]);

    return (
        <section className="rs-hero" ref={ref}>
            <motion.h1 style={reduce ? undefined : { y: headlineY, opacity: headlineOpacity }}>
                <motion.span
                    style={reduce ? undefined : { x: line1X }}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                >
                    From the root
                </motion.span>
                <motion.span
                    style={reduce ? undefined : { x: line2X }}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                >
                    to your spoon
                </motion.span>
            </motion.h1>

            <motion.p
                className="rs-hero-sub"
                style={reduce ? undefined : { opacity: headlineOpacity }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.8 }}
            >
                Slow-roasted peanuts, stone-ground in small batches. Nothing added that you can't pronounce.
            </motion.p>

            {/* Outer wrapper follows the scroll; inner handles the entrance so transforms don't fight */}
            <motion.div
                className="rs-hero-media"
                style={reduce ? undefined : { y: imgY, scale: imgScale, rotate: imgRotate }}
            >
                <motion.img
                    src={heroImage}
                    alt="The Root Company White Choco Crispy peanut butter tub bursting out of a swirl of peanut butter, peanuts and white chocolate"
                    width={1686}
                    height={933}
                    fetchPriority="high"
                    initial={{ opacity: 0, scale: 0.9, y: 60 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                />
            </motion.div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Shop — reveal on scroll + animated tab switching                    */
/* ------------------------------------------------------------------ */

const EASE = [0.2, 0.8, 0.2, 1] as const;

const wordReveal: Variants = {
    hidden: { y: "110%" },
    show: (i: number) => ({ y: "0%", transition: { delay: i * 0.08, duration: 0.8, ease: EASE } }),
};

const gridVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
    exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 60, rotate: -1.5 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.7, ease: EASE } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
};

function ProductCard({ product }: { product: Product }) {
    const ref = useRef<HTMLElement>(null);
    // Subtle image parallax while the card crosses the viewport
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const imgY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

    return (
        <motion.article ref={ref} className="rs-card" variants={cardVariants}>
            <div className="rs-card-top">
                <span className="rs-tag">{product.tag}</span>
                <span className="rs-rating">
                    {product.rating}
                    <Star />
                </span>
            </div>
            <div className="rs-card-img">
                <motion.img
                    src={product.img}
                    alt={`${product.name} peanut butter`}
                    loading="lazy"
                    style={{ y: imgY }}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </div>
            <h3>{product.name}</h3>
            <p className="rs-note">{product.note}</p>
            <div className="rs-card-foot">
                <span className="rs-price">
                    ₹{product.price}
                    <small>/ {product.size}</small>
                </span>
                <a className="rs-add" href="#">
                    ADD TO CART <Arrow />
                </a>
            </div>
        </motion.article>
    );
}

function Shop() {
    const [active, setActive] = useState<Category>("creamy");
    const visible = PRODUCTS.filter((p) => p.cat === active);
    const title = ["Pantry", "favourites"];

    return (
        <section className="rs-shop" id="shop">
            <motion.div
                className="rs-panel"
                initial={{ opacity: 0, y: 80 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.9, ease: EASE }}
            >
                <div className="rs-shop-head">
                    <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
                        {title.map((word, i) => (
                            <span className="rs-mask" key={word}>
                                <motion.span custom={i} variants={wordReveal}>
                                    {word}
                                </motion.span>
                            </span>
                        ))}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{ delay: 0.25, duration: 0.8, ease: EASE }}
                    >
                        Every jar starts with two ingredients: roasted peanuts and a pinch of rock salt. The rest is up to you.
                    </motion.p>
                </div>

                <div className="rs-tabs" role="tablist" aria-label="Filter by texture">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={active === tab.id}
                            className="rs-tab"
                            onClick={() => setActive(tab.id)}
                        >
                            {active === tab.id && (
                                <motion.span layoutId="rs-tab-pill" className="rs-tab-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                            )}
                            <span className="rs-tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={active}
                        className="rs-grid"
                        role="tabpanel"
                        variants={gridVariants}
                        initial="hidden"
                        whileInView="show"
                        exit="exit"
                        viewport={{ once: true, amount: 0.15 }}
                    >
                        {visible.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
    return <motion.div className="rs-progress" style={{ scaleX }} aria-hidden="true" />;
}

export default function TheRootStory() {
    return (
        <div className="rs-root">
            <ScrollProgress />
            <Nav />
            <main>
                <Hero />
                <Shop />
            </main>
        </div>
    );
}