import type { ReactNode } from "react";

export type IconName =
    | "box"
    | "receipt"
    | "card"
    | "truck"
    | "chart"
    | "plus"
    | "search"
    | "upload"
    | "x"
    | "image"
    | "check"
    | "back"
    | "refresh";

const SHAPES: Record<IconName, ReactNode> = {
    box: (
        <>
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5" />
            <path d="M12 13v8" />
        </>
    ),
    receipt: (
        <>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
            <path d="M9 8h6M9 12h6" />
        </>
    ),
    card: (
        <>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 10h18M7 15h3" />
        </>
    ),
    truck: (
        <>
            <path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" />
            <circle cx="6.5" cy="17.5" r="1.8" />
            <circle cx="17" cy="17.5" r="1.8" />
        </>
    ),
    chart: <path d="M4 20V11M10 20V5M16 20v-6M3 20h18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
        <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
        </>
    ),
    upload: <path d="M12 15V4M7 9l5-5 5 5M4 15v5h16v-5" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    image: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M21 16l-5-5-8 8" />
        </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7" />,
    back: <path d="M15 5l-7 7 7 7" />,
    refresh: (
        <>
            <path d="M20 12a8 8 0 1 1-2.35-5.65" />
            <path d="M20 4v5h-5" />
        </>
    ),
};

interface IconProps {
    name: IconName;
    size?: number;
}

export default function Icon({ name, size = 18 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {SHAPES[name]}
        </svg>
    );
}