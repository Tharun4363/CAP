import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {jwtDecode} from 'jwt-decode'; // You would need to install this

type User = {
  id: string;
  cust_uniq_id: string;
  cust_id: string;
  token?: string;
  // Add other user properties as needed
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkTokenValidity = (token: string): boolean => {
    try {
      const decoded: {exp?: number} = jwtDecode(token);
      if (decoded.exp && decoded.exp * 1000 > Date.now()) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loadUserData = async () => {
    try {
      const [token, custUniqId, custId] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('cust_uniq_id'),
        AsyncStorage.getItem('customerId'),
      ]);

      if (token && checkTokenValidity(token) && custUniqId && custId) {
        setIsAuthenticated(true);
        setUser({
          id: custId,
          cust_uniq_id: custUniqId,
          cust_id: custId,
          token: token,
        });
      } else {
        await clearAuthData();
      }
    } catch (err) {
      setError('Failed to load user data');
      console.error('Failed to load user data', err);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'cust_uniq_id', 'customerId']);
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      setError('Failed to clear authentication data');
      console.error('Failed to clear auth data', err);
    }
  };

  const login = async (token: string, userData: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('token', token),
        AsyncStorage.setItem('cust_uniq_id', userData.cust_uniq_id),
        AsyncStorage.setItem('customerId', userData.cust_id),
      ]);
      setIsAuthenticated(true);
      setUser(userData);
      setError(null);
    } catch (err) {
      setError('Failed to save authentication data');
      console.error('Login failed', err);
      throw err;
    }
  };

  const logout = async () => {
    await clearAuthData();
  };

  const refreshAuth = async () => {
    setLoading(true);
    await loadUserData();
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      user,
      loading,
      error,
      login,
      logout,
      refreshAuth,
    }),
    [isAuthenticated, user, loading, error],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
