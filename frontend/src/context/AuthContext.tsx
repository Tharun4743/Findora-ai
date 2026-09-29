import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User, NotificationItem, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('findora_token') || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Check active session on mount
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const savedToken = localStorage.getItem('findora_token');
    if (!savedToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
        loadNotifications();
      } else {
        logout();
      }
    } catch (err: any) {
      console.warn('Session verification failed, clearing token:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = () => {
    api.getNotifications().then(data => {
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: NotificationItem) => !n.read).length);
      }
    }).catch(console.error);
  };

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    if (data.token && data.user) {
      localStorage.setItem('findora_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      loadNotifications();
      return data;
    }
    throw new Error('Authentication failed');
  };

  const register = async (userData: any) => {
    const data = await api.register(userData);
    if (data.token && data.user) {
      localStorage.setItem('findora_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      loadNotifications();
      return data;
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('findora_token');
    setToken('');
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const personas: User[] = [
    { id: 'usr_student_alex', name: 'Ramkishore SM', email: 'ramkishoresm@gmail.com', role: 'student' },
    { id: 'usr_officer_vance', name: 'Tamilselvan S', email: 'sivakumar463703@gmail.com', role: 'verification_officer' },
    { id: 'usr_admin_root', name: 'Tharunkumar K', email: 'tharunkumark42007@gmail.com', role: 'admin' }
  ];

  const switchPersona = async (id: string) => {
    const found = personas.find(p => p.id === id);
    if (found) {
      setCurrentUser(found);
    }
  };

  const currentRole = currentUser?.role === 'user' ? 'student' : (currentUser?.role || 'student');

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      loading,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentRole === 'admin' || currentRole === 'verification_officer',
      isSuperAdmin: currentRole === 'admin',
      isOfficer: currentRole === 'verification_officer',
      isStudent: currentRole === 'student',
      role: currentRole,
      login,
      register,
      logout,
      notifications,
      unreadCount,
      refreshNotifications: loadNotifications,
      personas,
      switchPersona
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
