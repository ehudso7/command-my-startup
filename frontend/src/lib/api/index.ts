// This file serves as a proxy for the backend API
// It will use the real backend in development and a mock in production builds

import * as realBackend from './backend';
import * as mockBackend from './backend-mock';

// Use environment variables to determine which implementation to use
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

// Use mock backend on Vercel builds to avoid module resolution issues
const api = (isVercel || isProduction) ? mockBackend : realBackend;

export const {
  refreshAuthToken,
  executeCommand,
  getUserProfile,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getCommandHistory,
  getUsageStats,
  registerUser,
  loginUser,
  logoutUser
} = api;