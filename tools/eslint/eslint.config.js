// ESLint flat config (NS4-04).
// Paketler bu klasörün node_modules'undan çözülür (typescript-eslint için TypeScript 6.0.3).
// Kökteki eslint.config.js bu dosyayı yeniden export eder; böylece taban yol depo köküdür.
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'tools/eslint/node_modules/**', 'legacy/**'],
  },
  {
    // Uygulama kaynağı: tarayıcı ortamı, type-aware kurallar
    files: ['src/**/*.ts', 'vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: rootDir },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'all' }],
    },
  },
  {
    // Yapılandırma dosyaları: Node ortamı, type-aware olmayan kurallar
    files: ['eslint.config.js', 'tools/eslint/eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node, sourceType: 'module' },
  },
  // Biçim kuralları Prettier'a aittir; çakışan ESLint kurallarını kapatır (en sonda olmalı).
  prettierConfig,
);
