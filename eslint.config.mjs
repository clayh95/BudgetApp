import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';
import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'out-tsc/**', '.angular/**', 'coverage/**', '.scratch/**', 'functions/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      curly: ['error', 'all'],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: 'function',
          next: '*',
        },
      ],
      '@stylistic/lines-between-class-members': ['error', 'always'],
    },
  },
  prettier,
];
