/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#416FE2',
          dark: '#223059',
          light: '#F2F5FA',
          lowLight: '#5E90F2',
        },
        gray: '#D4D4D4',
      },
      fontFamily: {
        // KoPub Batang 계열
        'kopub-batang-bold': ['KoPubBatangBold'],
        'kopub-batang-light': ['KoPubBatangLight'],
        'kopub-batang-medium': ['KoPubBatangMedium'],
        // KoPub Dotum 계열
        'kopub-dotum-bold': ['KoPubDotumBold'],
        'kopub-dotum-light': ['KoPubDotumLight'],
        'kopub-dotum-medium': ['KoPubDotumMedium'],
      },
    },
  },
  plugins: [],
};
