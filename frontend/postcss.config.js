// Check if we're in a Vercel build environment
const isVercel = process.env.VERCEL === '1';

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
