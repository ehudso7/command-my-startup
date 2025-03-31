export default {
  'env': {
    'browser': true,
    'node': true,
    'es2021': true
  },
  'globals': {
    'require': 'readonly',
    'module': 'readonly',
    'exports': 'readonly',
    'self': 'readonly',
    'document': 'readonly',
    'window': 'readonly'
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  'parserOptions': {
    'ecmaVersion': 12,
    'sourceType': 'module'
  }
};
