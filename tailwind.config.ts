import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}', // Include pages if they exist
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}', // Standard Next.js app directory
  ],
  theme: {
    extend: {
      colors: {
        'brand-white': '#FFFFFF',
        'brand-primary': '#007EA7', // Primary Blue
        'brand-secondary': '#00A8E8', // Secondary Blue
        'brand-green': '#2ECC71', // Complementary Green (Emerald)
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config