const globals = require('globals')
const expoConfig = require('eslint-config-expo/flat')

module.exports = [
  {
    ignores: ['.expo', '.expo-shared', 'dist', 'node_modules', 'eslint.config.js'],
  },
  ...expoConfig,
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/__tests__/**/*.test.ts'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
      // SDK 57 enables React Compiler diagnostics by default. Keep the pre-upgrade
      // lint contract until App.tsx is decomposed in its dedicated client-state work.
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]
