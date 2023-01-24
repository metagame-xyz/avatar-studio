// import colors from 'tailwindcss/colors'
// import defaultTheme from 'tailwindcss/defaultTheme'
const primaryDefault = '#6a45ec'
const primaryDark = '#5437bc'

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
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
                'fade-in-fast':
                    '0.1s ease 0.05s 1 normal forwards running fadeIn',
                tooltip: '0.3s ease 0.05s 1 normal forwards running tooltip',
                carousel:
                    '180s linear 0s infinite normal none running carousel',
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
                    charcoal: '#36445F',
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
