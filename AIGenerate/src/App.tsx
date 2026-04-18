/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

// Pages - to be created
import Login from './pages/Login';
import Dashboard from './pages/instructor/Dashboard';
import AssignmentManage from './pages/instructor/AssignmentManage';
import StudentManage from './pages/instructor/StudentManage';
import SubmissionDetail from './pages/instructor/SubmissionDetail';
import AssignmentList from './pages/student/AssignmentList';
import AssignmentDetail from './pages/student/AssignmentDetail';
import SubmissionHistory from './pages/student/SubmissionHistory';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role: 'student' | 'instructor' }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">加载中...</div>;
  }

  if (!user || user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Student Routes */}
          <Route path="/assignments" element={<ProtectedRoute role="student"><AssignmentList /></ProtectedRoute>} />
          <Route path="/assignments/:id" element={<ProtectedRoute role="student"><AssignmentDetail /></ProtectedRoute>} />
          <Route path="/assignments/:id/submissions" element={<ProtectedRoute role="student"><SubmissionHistory /></ProtectedRoute>} />
          
          {/* Instructor Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute role="instructor"><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/assignments" element={<ProtectedRoute role="instructor"><AssignmentManage /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute role="instructor"><StudentManage /></ProtectedRoute>} />
          <Route path="/admin/assignments/:id/submissions" element={<ProtectedRoute role="instructor"><SubmissionDetail /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
