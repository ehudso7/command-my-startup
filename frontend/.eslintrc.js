module.exports = {
  'env': {
    'browser': true,
    'node': true,  // Ensures Node.js globals like 'module' and 'require' are available
    'es2021': true
  },
  'globals': {
    'module': 'readonly',  // This ensures 'module' is treated as a global variable
    'exports': 'readonly',
    'self': 'readonly',
    'document': 'readonly',
    'window': 'readonly',
    'process': 'readonly',
    'Buffer': 'readonly',
    'require': 'readonly'  // Added 'require' to globals  
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

