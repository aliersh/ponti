// ESLint flat config — rules-of-hooks safety net for the React + TypeScript app.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  { ignores: ['dist', 'node_modules', 'src/generated'] },

  // JS recommended baseline — with Node globals for .mjs scripts
  {
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: { console: 'readonly', process: 'readonly' },
    },
  },

  // TypeScript-eslint recommended (type-unaware)
  ...tseslint.configs.recommended,

  // React Hooks plugin — flat-config entry (plugins key is an object, not an array)
  reactHooks.configs.flat['recommended-latest'],

  // Project-specific overrides
  {
    rules: {
      // --- Core safety net (never downgrade) ---
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // --- v7 behavioral rules beyond the rules-of-hooks safety net ---
      // These fire on valid intentional patterns in the existing codebase.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/void-use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',

      // --- baseline noise ---
      // catch {} is a valid intentional swallow pattern (e.g. window.open navigation errors)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // --- typescript-eslint noise on legitimate patterns ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
