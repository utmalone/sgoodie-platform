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
        ink: '#2b2b2b',
        paper: '#ffffff',
        muted: '#3c3c3c',
        line: '#e6e6e6',
        fog: '#f7f7f7'
      }
    }
  },
  plugins: []
};

export default config;
