/** @type {import("prettier").Config} */
module.exports = {
    singleQuote: true,
    semi: false,
    tabWidth: 4,
    trailingComma: 'all',
    plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
    pluginSearchDirs: false,
    tailwindConfig: './tailwind.config.cjs',
    printWidth: 120,
}
