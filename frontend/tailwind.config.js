/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        screens: {
            sm: "640px",
            md: "768px",
            lg: "1024px",
            xl: "1280px",
            "2xl": "1536px",
        },
        extend: {
            fontFamily: {
                sans: ["var(--wp-font-body)"],
                display: ["var(--wp-font-display)"],
                mono: ["Roboto Mono", "ui-monospace", "monospace"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                "wp-sm": "var(--wp-radius-sm)",
                "wp-md": "var(--wp-radius-md)",
                "wp-lg": "var(--wp-radius-lg)",
                "wp-xl": "var(--wp-radius-xl)",
                "wp-2xl": "var(--wp-radius-2xl)",
            },
            boxShadow: {
                "wp-sm": "var(--wp-shadow-sm)",
                "wp-md": "var(--wp-shadow-md)",
                "wp-float": "var(--wp-shadow-float)",
            },
            spacing: {
                "wp-gap": "var(--wp-gap)",
                "wp-pad": "var(--wp-card-pad)",
            },
            zIndex: {
                sticky: "20",
                sidebar: "30",
                dropdown: "100",
                modal: "200",
                toast: "300",
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    soft: "hsl(var(--wp-primary-soft))",
                    tint: "hsl(var(--wp-primary-tint))",
                    strong: "hsl(var(--wp-primary-700))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                ink: {
                    DEFAULT: "hsl(var(--wp-ink))",
                    muted: "hsl(var(--wp-ink-muted))",
                    faint: "hsl(var(--wp-ink-faint))",
                },
                surface: {
                    cream: "hsl(var(--wp-surface-cream))",
                    ivory: "hsl(var(--wp-surface-ivory))",
                    sunken: "hsl(var(--wp-surface-sunken))",
                },
                chart: {
                    1: "hsl(var(--chart-1))",
                    2: "hsl(var(--chart-2))",
                    3: "hsl(var(--chart-3))",
                    4: "hsl(var(--chart-4))",
                    5: "hsl(var(--chart-5))",
                },
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
