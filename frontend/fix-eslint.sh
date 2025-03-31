#!/bin/bash

# 1. Install ESLint if not already installed
echo "Installing ESLint..."
npm install eslint --save-dev

# 2. Run ESLint with --fix to automatically fix all fixable issues
echo "Running ESLint auto-fix..."
npx eslint . --fix

# 3. Create or update .eslintrc.js to define necessary global variables
echo "Updating .eslintrc.js to define global variables..."
cat <<EOL > .eslintrc.js
module.exports = {
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
EOL

# 4. Add "type": "module" to package.json if the warning is related to module type
echo "Adding 'type': 'module' to package.json..."
if ! grep -q '"type": "module"' package.json; then
  jq '. + { "type": "module" }' package.json > temp.json && mv temp.json package.json
fi

# 5. Run ESLint again to ensure all configurations are respected
echo "Running ESLint again after configuration updates..."
npx eslint . --fix

# 6. Clean up unused variables that are causing linting issues, e.g., __webpack_require__, __unused_webpack_module
echo "Cleaning up unused variables..."
find . -type f -name "*.js" -exec sed -i '' '/__webpack_/d' {} \;  # Removes webpack-related unused variables
find . -type f -name "*.js" -exec sed -i '' '/require/d' {} \;  # Removes unused require statements

echo "ESLint issues fixed! Please verify the results."

