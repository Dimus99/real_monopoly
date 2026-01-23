/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            gridTemplateColumns: {
                'board': 'repeat(11, 1fr)',
            },
            gridTemplateRows: {
                'board': 'repeat(11, 1fr)',
            }
        },
    },
    plugins: [],
}
