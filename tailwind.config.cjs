// import colors from 'tailwindcss/colors'
// import defaultTheme from 'tailwindcss/defaultTheme'
const primaryDefault = '#6a45ec'
const primaryDark = '#5437bc'

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            backgroundImage: {
                'jupiter-pattern': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Cpath fill='%23f0fdfa' fill-opacity='0.08' d='M0 17.83V0h17.83a3 3 0 0 1-5.66 2H5.9A5 5 0 0 1 2 5.9v6.27a3 3 0 0 1-2 5.66zm0 18.34a3 3 0 0 1 2 5.66v6.27A5 5 0 0 1 5.9 52h6.27a3 3 0 0 1 5.66 0H0V36.17zM36.17 52a3 3 0 0 1 5.66 0h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 0 1 0-5.66V52H36.17zM0 31.93v-9.78a5 5 0 0 1 3.8.72l4.43-4.43a3 3 0 1 1 1.42 1.41L5.2 24.28a5 5 0 0 1 0 5.52l4.44 4.43a3 3 0 1 1-1.42 1.42L3.8 31.2a5 5 0 0 1-3.8.72zm52-14.1a3 3 0 0 1 0-5.66V5.9A5 5 0 0 1 48.1 2h-6.27a3 3 0 0 1-5.66-2H52v17.83zm0 14.1a4.97 4.97 0 0 1-1.72-.72l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1 0-5.52l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43c.53-.35 1.12-.6 1.72-.72v9.78zM22.15 0h9.78a5 5 0 0 1-.72 3.8l4.44 4.43a3 3 0 1 1-1.42 1.42L29.8 5.2a5 5 0 0 1-5.52 0l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1-.72-3.8zm0 52c.13-.6.37-1.19.72-1.72l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43a5 5 0 0 1 5.52 0l4.43-4.43a3 3 0 1 1 1.42 1.41l-4.44 4.43c.36.53.6 1.12.72 1.72h-9.78zm9.75-24a5 5 0 0 1-3.9 3.9v6.27a3 3 0 1 1-2 0V31.9a5 5 0 0 1-3.9-3.9h-6.27a3 3 0 1 1 0-2h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 1 1 2 0v6.27a5 5 0 0 1 3.9 3.9h6.27a3 3 0 1 1 0 2H31.9z'%3E%3C/path%3E%3C/svg%3E")`,
            },
            // gridTemplateColumns: (theme) => {
            //     const spacing = theme('spacing')
            //     console.log('spacing', spacing)
            //     return Object.keys(spacing).reduce(
            //         (accumulator, spacingKey) => {
            //             return {
            //                 ...accumulator,
            //                 [`fill-${spacingKey}`]: `repeat(auto-fill, minmax(${spacing[spacingKey]}, 1fr))`,
            //             }
            //         },
            //         {},
            //     )
            // },
            // colors: {
            //     brand: '#85C9C1',
            //     black: '#010505',
            // },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fade: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                tooltip: {
                    '0%': { opacity: '0', transform: 'translateY(2px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                carousel: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(calc(-136px*12))' }, // 136 = 120px + 16px (1rem) gap
                },
            },
            animation: {
                fade: '0.5s ease 0.05s 1 normal forwards running fade',
                'fade-in-1': '0.5s ease 0.05s 1 normal forwards running fadeIn',
                'fade-in-2': '0.5s ease 0.15s 1 normal forwards running fadeIn',
                'fade-in-3': '0.6s ease 0.3s 1 normal forwards running fadeIn',
                'fade-in-4': '0.6s ease 0.4s 1 normal forwards running fadeIn',
                'fade-in-5': '0.7s ease 0.5s 1 normal forwards running fadeIn',
                'fade-in-fast': '0.1s ease 0.05s 1 normal forwards running fadeIn',
                tooltip: '0.3s ease 0.05s 1 normal forwards running tooltip',
                carousel: '180s linear 0s infinite normal none running carousel',
            },
            boxShadow: {
                glow: '0px 2px 16px 0px rgba(62, 25, 189, 1), 0px 2px 10px 0px rgba(25, 4, 52, 1)',
                tooltip: '0 0 56px 0 #000000 10%, 0 3px 6px 0 #000000 16%',
            },
            fontSize: {
                xxs: ['0.625rem', '0.78rem'],
            },
            fontFamily: {
                // sans: ['Inter', ...defaultTheme.fontFamily.sans],
                // title: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
            },
            screens: {
                xs: '520px',
            },
            // Using https://www.color-name.com to generate ui color names
            colors: {
                primary: {
                    DEFAULT: primaryDefault,
                    dark: primaryDark,
                    darker: '#322170',
                },
                secondary: {
                    DEFAULT: '#b10bff',
                    dark: '#8d08cc',
                },
                ui: {
                    royal: '#6e42ed',
                    cerulean: '#0daef3',
                    turquoise: '#0c97d4',
                    meadow: '#21ce99',
                    gunmetal: {
                        DEFAULT: '#131c2d',
                        light: '#1C2033',
                        dark: '#1F2431',
                    },
                    folly: '#FF0651',
                    'purple-navy': '#455482',
                    'yankee-blue': { DEFAULT: '#1e293b', light: '#1E2848' },
                    'dark-jungle': '#141B27',
                    'eerie-black': '#111729',
                    gray: '#212B36',
                },
                // black: '#0b101a',
                black: '#010505',
                brand: '#85C9C1',
                // slate: colors.slate,
                // neutral: colors.neutral,
                'off-white': '#eeeeee',
                lowOpacityBlackBg: 'rgb(17, 24, 39, 0.2)',
            },
            // typography: (theme) => ({
            //     DEFAULT: {
            //         css: {
            //             a: {
            //                 color: primaryDefault,
            //                 '&:hover': {
            //                     color: primaryDark,
            //                 },
            //             },
            //             '--tw-prose-invert-code': theme('colors.gray.300'),
            //             '--tw-prose-invert-bold': theme('colors.gray.300'),
            //             'code::before': {
            //                 content: '""',
            //             },
            //             'code::after': {
            //                 content: '""',
            //             },
            //         },
            //     },
            // }),
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
