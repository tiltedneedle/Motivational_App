// https://docs.expo.dev/guides/using-eslint/
//
// Here for one rule above all: `react-hooks/rules-of-hooks`. A `useState`
// declared below an early return was found by reading, on the screen that
// shows the Book — it would have thrown the moment a Book appeared or was
// deleted. TypeScript cannot see that class of bug; this can.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // The accessibility rules the platform can check statically: a touchable
    // inside a touchable, an accessibilityState that is not one, a live
    // region that is not one, a role the platform does not have. The
    // plugin ships legacy-format configs; its rules are registered here by
    // hand for the flat config, all of them, as errors — the audit that put
    // them here was a research-backed one and the bar is WCAG 2.2 AA.
    files: ['**/*.tsx'],
    plugins: { 'react-native-a11y': a11y },
    rules: {
      ...Object.fromEntries(Object.keys(a11y.rules).map((r) => [`react-native-a11y/${r}`, 'error'])),
      // A hint on every labelled control is not the platform's advice (Apple
      // HIG: hints are for when the label alone is not enough), and a hint
      // that restates the label is read out twice. Hints are written where
      // they say something.
      'react-native-a11y/has-accessibility-hint': 'off',
    },
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
