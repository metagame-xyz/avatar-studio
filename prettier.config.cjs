/** @type {import("prettier").Config} */
module.exports = {
    singleQuote: true,
    semi: false,
    tabWidth: 4,
    trailingComma: 'all',

    importOrder: [
        '^react$|^next$',
        '<THIRD_PARTY_MODULES>',
        '^env/(.*)$',
        '^server/(.*)$',
        '^utils(.*)$',
        '^pages/(.*)$',
        '^api/(.*)$',
        '^components/(.*)$',
        '^styles/(.*)$',
        '^[./]',
    ],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
    importOrderCaseInsensitive: true,
    plugins: [
        'prettier-plugin-organize-imports',
        'prettier-plugin-tailwindcss',
    ],
    pluginSearchDirs: false,
    tailwindConfig: './tailwind.config.cjs',
}
