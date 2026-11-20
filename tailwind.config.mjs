/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F2',
        paperDark: '#EFECE4',
        ink: '#141414',
        inkMuted: '#555555',
        silverBorder: '#E2E0D8',
        silverAccent: '#C8C6BE',
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
