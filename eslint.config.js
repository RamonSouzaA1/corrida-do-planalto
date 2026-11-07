import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'android/',
      'ios/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'specs/',
      '.specify/',
      '.claude/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['src/core/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'src/core é lógica pura e não pode importar o Phaser.',
            },
          ],
        },
      ],
    },
  },
];
