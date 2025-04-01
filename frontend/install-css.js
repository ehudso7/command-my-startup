/**
 * This script ensures CSS-related packages are installed correctly
 * Used specifically to fix Vercel build issues with PostCSS and Tailwind
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

try {
  log('Starting CSS dependency installation script');
  
  // Force-install CSS-related dependencies
  const dependencies = [
    'autoprefixer@10.4.21',
    'postcss@8.5.3',
    'tailwindcss@3.4.1'
  ];
  
  // Try different installation approaches
  log(`Installing CSS dependencies: ${dependencies.join(', ')}`);
  
  try {
    // First try with npm
    log('Attempting npm installation...');
    execSync(`npm install --no-save ${dependencies.join(' ')}`, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' } // Force development mode for installation
    });
  } catch (e) {
    log(`npm installation failed: ${e.message}`);
    log('Attempting direct file verification...');
    
    // Verify the modules exist in node_modules
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    dependencies.forEach(dep => {
      const packageName = dep.split('@')[0];
      const packageDir = path.join(nodeModulesPath, packageName);
      
      if (!fs.existsSync(packageDir)) {
        log(`Warning: ${packageName} directory not found in node_modules`);
      } else {
        log(`Found ${packageName} directory in node_modules`);
      }
    });
  }
  
  // Create local copies of critical CSS config files for Vercel
  log('Setting up CSS configuration files');
  
  // Copy the Vercel-specific postcss config to the standard filename
  try {
    const vercelPostcssConfig = path.join(process.cwd(), 'postcss.config.vercel.js');
    const standardPostcssConfig = path.join(process.cwd(), 'postcss.config.js');
    
    if (fs.existsSync(vercelPostcssConfig)) {
      fs.copyFileSync(vercelPostcssConfig, standardPostcssConfig);
      log('Copied Vercel-specific PostCSS config');
    }
  } catch (e) {
    log(`Error copying PostCSS config: ${e.message}`);
  }
  
  log('CSS dependency installation completed');
} catch (error) {
  log(`Error in installation script: ${error.message}`);
  // Don't exit with error code, as we want the build to continue
}