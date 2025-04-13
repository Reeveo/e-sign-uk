import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Original brand colors kept for backward compatibility
        'brand-white': '#FFFFFF',
        'brand-primary': '#007EA7',
        'brand-secondary': '#00A8E8',
        'brand-green': '#2ECC71',
        
        // New Design System Colors
        'esign-background': '#F3F4F6',
        'esign-card': '#FFFFFF',
        'esign-primary-text': '#1F2937',
        'esign-secondary-text': '#6B7280',
        'esign-border': '#E5E7EB',
        'esign-button-primary': '#1F2937',
        'esign-button-primary-hover': '#374151',
        'esign-button-secondary': '#FFFFFF',
        'esign-button-secondary-hover': '#F9FAFB',
        'esign-button-secondary-border': '#D1D5DB',
        'esign-waiting': '#F59E0B',
        'esign-signed': '#10B981',
        'esign-draft': '#6B7280',
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