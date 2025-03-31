import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";

export default [
  // ========================
  // BASE CONFIGURATIONS
  // ========================
  js.configs.recommended,

  // ========================
  // NEXT.JS CONFIG
  // ========================
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-img-element": "warn",
    },
    settings: {
      react: {
        version: "detect", // Automatically detects the React version
      },
    },
  },

  // ========================
  // TYPESCRIPT CONFIG
  // ========================
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // Enforce better type safety
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off", // Allow implicit return types if preferred
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // ========================
  // REACT CONFIG
  // ========================
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // ========================
  // GLOBAL RULES
  // ========================
  {
    rules: {
      // Handle unused variables globally
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error", // Ensure all variables are properly defined
    },
  },
];
