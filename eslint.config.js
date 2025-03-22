module.exports = [
  {
    languageOptions: {
      globals: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
        // Three.js globals
        THREE: 'readonly',
        // Test globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest', // or 2022
        sourceType: 'module',
      },
    },
    rules: {
      // Error prevention
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['warn', {
        allow: ['warn', 'error', 'info'],
      }],
      'no-debugger': 'warn',
      // Style consistency
      indent: ['error', 2],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', {
        avoidEscape: true,
        allowTemplateLiterals: true,
      }],
      semi: ['error', 'always'],
      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-throw-literal': 'error',
      // Game-specific
      'max-classes-per-file': 'off', // Allow multiple classes in component files
      'class-methods-use-this': 'off', // Class methods don't always need to use 'this'
    },
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      // Relaxed rules for tests
      'no-unused-expressions': 'off',
    },
  },
];