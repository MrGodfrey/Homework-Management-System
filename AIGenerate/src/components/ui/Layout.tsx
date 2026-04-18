import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Users, GraduationCap, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentRole = user?.role;

  const adminNavPoints = [
    { label: '看板', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: '作业管理', icon: FileText, path: '/admin/assignments' },
    { label: '学生管理', icon: Users, path: '/admin/students' },
  ];

  const studentNavPoints = [
    { label: '作业列表', icon: GraduationCap, path: '/assignments' },
  ];

  const navPoints = currentRole === 'instructor' ? adminNavPoints : studentNavPoints;

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-lg leading-none">ClassLink</h1>
              <span className="text-xs text-gray-500 font-medium tracking-tight uppercase">System</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navPoints.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon size={20} className={cn("transition-colors", isActive ? "text-blue-600" : "group-hover:text-gray-900")} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-y-2 left-0 w-1 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs border border-blue-200">
                {user?.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  {user?.role === 'instructor' ? 'Instructor' : user?.student_id}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 flex items-center justify-between md:hidden shadow-sm">
           <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={24} />
            <h1 className="font-bold text-gray-900">ClassLink</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
