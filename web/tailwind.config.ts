import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f11',
          1: '#18181c',
          2: '#222228',
          3: '#2e2e36',
        },
        brand: {
          DEFAULT: '#7c6af7',
          hover: '#9183f9',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
