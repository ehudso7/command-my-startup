module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
    'next/core-web-vitals',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-explicit-any': 'off',

    // React rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',

    // Prettier integration
    'prettier/prettier': ['error'],

    // Additional preferences
    'no-console': 'warn',
    'no-undef': 'off' // Let TypeScript handle it
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};

