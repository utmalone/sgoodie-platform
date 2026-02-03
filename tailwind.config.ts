import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        parchment: '#f7f3ee',
        brass: '#b08a5b'
      }
    }
  },
  plugins: []
};

export default config;
