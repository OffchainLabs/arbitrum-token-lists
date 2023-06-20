module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  ignorePatterns: ['dist'],
  extends: ['@offchainlabs/eslint-config-typescript/base'],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { ignoreRestSiblings: true },
    ],
  },
};
