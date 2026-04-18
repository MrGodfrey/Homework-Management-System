import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';
import { readDb } from '../lib/db';

interface AuthContextType {
  user: User | null;
  login: (role: Role, identifier: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') as Role;
    const identifier = localStorage.getItem('identifier');

    if (token && role && identifier) {
      restoreUser(role, identifier);
    } else {
      setIsLoading(false);
    }
  }, []);

  const restoreUser = (role: Role, identifier: string) => {
    const db = readDb();
    if (role === 'instructor') {
      if (db.instructor.username === identifier) {
        setUser({ id: 0, name: db.instructor.name, role: 'instructor', username: identifier });
      }
    } else if (role === 'student') {
      const student = db.students.find(s => s.student_id === identifier);
      if (student) {
        setUser({ id: student.id, name: student.name, role: 'student', student_id: identifier });
      }
    }
    setIsLoading(false);
  };

  const login = async (role: Role, identifier: string, password?: string) => {
    const db = readDb();
    if (role === 'instructor') {
      if (db.instructor.username === identifier && db.instructor.password === password) {
        const u: User = { id: 0, name: db.instructor.name, role, username: identifier };
        setUser(u);
        localStorage.setItem('token', `${role}:${identifier}`);
        localStorage.setItem('role', role);
        localStorage.setItem('identifier', identifier);
        return true;
      }
    } else if (role === 'student') {
      const student = db.students.find(s => s.student_id === identifier);
      if (student && (student.password === password || !password)) {
        const u: User = { id: student.id, name: student.name, role, student_id: identifier };
        setUser(u);
        localStorage.setItem('token', `${role}:${identifier}`);
        localStorage.setItem('role', role);
        localStorage.setItem('identifier', identifier);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('identifier');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
