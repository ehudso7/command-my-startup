import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Define API URL
const API_URL = 'https://your-backend-url.com/api'; // Replace with your actual API URL

// Auth context type
interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing user session on startup
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        
        if (userData && token) {
          // Set authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      const { user, token } = response.data;
      
      // Save user data and token
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', token);
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
    } catch (error: any) {
      console.error('Login error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Failed to login');
    }
  };
  
  // Register function
  const register = async (email: string, password: string, fullName: string) => {
    try {
      await axios.post(`${API_URL}/auth/register`, { email, password, fullName });
      
      // After registration, login automatically
      await login(email, password);
    } catch (error: any) {
      console.error('Registration error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Failed to register');
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      // Clear stored user data and token
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      
      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
