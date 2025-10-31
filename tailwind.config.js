/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados del tema
        indigo: {
          500: 'rgb(99, 102, 241)',
          600: 'rgb(79, 70, 229)',
        },
        orange: {
          500: 'rgb(249, 115, 22)',
          600: 'rgb(234, 88, 12)',
        },
        green: {
          500: 'rgb(34, 197, 94)',
          600: 'rgb(22, 163, 74)',
        },
        blue: {
          500: 'rgb(59, 130, 246)',
          600: 'rgb(37, 99, 235)',
        },
        purple: {
          500: 'rgb(168, 85, 247)',
          600: 'rgb(147, 51, 234)',
        },
      },
    },
  },
  plugins: [],
}
