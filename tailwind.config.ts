import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hearth: {
          cream: '#FFFDF9',
          ink: '#2B1405',
          bark: '#3D1A06',
          ember: '#8A3B12',
        },
      },
    },
  },
  plugins: [],
};

export default config;