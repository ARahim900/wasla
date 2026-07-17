import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

const SRC = ["src/**/*.{js,mjs,cjs,jsx}"];

export default [
  {
    files: SRC,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    ...pluginJs.configs.recommended,
  },
  {
    files: SRC,
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      // Underscore-prefixed names are intentional throwaways (destructure-omit,
      // void _id patterns in preparePayload, etc.). `React` is allowed unused
      // under the automatic JSX runtime, and unused catch bindings are fine.
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^(_|React$)", caughtErrors: "none" },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // Required so no-unused-vars sees identifiers referenced only in JSX
      // (otherwise every component import reads as unused).
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
