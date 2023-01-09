// import colors from 'tailwindcss/colors'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require('tailwindcss/colors')
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        colors: {
            ...colors,
            // brand: '#85C9C1',
            black: '#010505',
        },
        extend: {},
    },
    plugins: [],
}
