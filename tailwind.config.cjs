// import colors from 'tailwindcss/colors'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require('tailwindcss/colors')
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: '#85C9C1',
                black: '#010505',
            },
        },
    },
    plugins: [],
}
