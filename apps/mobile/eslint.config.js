// https://docs.expo.dev/guides/using-eslint/
//
// Here for one rule above all: `react-hooks/rules-of-hooks`. A `useState`
// declared below an early return was found by reading, on the screen that
// shows the Book — it would have thrown the moment a Book appeared or was
// deleted. TypeScript cannot see that class of bug; this can.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Errors: the ones that are bugs.
      'react-hooks/rules-of-hooks': 'error',
      'react/no-unescaped-entities': 'error',

      // Warnings: the React Compiler's opinions about refs read during render
      // and state set inside effects. Both are the standard react-native
      // pattern in the gesture and timer code here (a "latest value" ref for a
      // PanResponder, a clock that ticks state in an effect), and both work.
      // They are worth a deliberate pass one day, not a blanket rewrite to
      // make a linter quiet, and not silence either — a warning is the honest
      // level for "the compiler would like a word".
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // The TypeScript plugin is scoped to these files by the Expo config, so
    // the override has to be too — a rule named for a plugin that is not in
    // scope is a configuration error, not a quieter rule.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]);
