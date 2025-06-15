import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export const useAuthRequired = () => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    throw new Error('This component requires authentication');
  }
  
  return { user };
};
