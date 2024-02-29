module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env === 'production' ? 'warn' : 'off',
    'no-debugger': process.env === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/camelcase': 'off',
    'no-irregular-whitespace': 'off',
    'vue/no-reserved-component-names': 'off',
    '@typescript-eslint/no-var-requires': 0,
    camelcase: 'off',
    'prettier/prettier': [
      'warn',
      {
        semi: false,
        singleQuote: true,
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        endOfLine: 'auto',
        trailingComma: 'none',
        arrowParens: 'avoid'
      }
    ]
  }
}
