import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { Button, Input, Card } from '../components/ui/Common';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      toast.error('请输入用户标识');
      return;
    }

    setIsSubmitting(true);
    const success = await login(role, identifier, password);
    setIsSubmitting(false);

    if (success) {
      toast.success('登录成功');
      navigate(role === 'instructor' ? '/admin/dashboard' : '/assignments');
    } else {
      toast.error('登录失败，请检查凭据');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4 rotate-3">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ClassLink</h1>
          <p className="text-gray-500 mt-2">欢迎回来，管理并跟进您的学术任务</p>
        </div>

        <Card className="p-8">
          <div className="flex bg-gray-50 p-1 rounded-2xl mb-8">
            <button
              onClick={() => { setRole('student'); setIdentifier(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              学生
            </button>
            <button
              onClick={() => { setRole('instructor'); setIdentifier(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === 'instructor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              教师
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                {role === 'instructor' ? '用户名' : '学号'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                  <UserIcon size={18} />
                </div>
                <Input
                  className="pl-10"
                  placeholder={role === 'instructor' ? '默认: teacher' : '默认: 20230001'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">密码</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={18} />
                </div>
                <Input
                  type="password"
                  className="pl-10"
                  placeholder={role === 'instructor' ? '默认: 123456' : '默认: 20230001'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-base py-6"
              loading={isSubmitting}
            >
              进入系统 <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-400 mt-8 font-medium">
          教师默认凭证: <span className="text-gray-500">teacher / 123456</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
