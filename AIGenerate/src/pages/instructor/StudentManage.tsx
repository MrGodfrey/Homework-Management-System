import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb, writeDb, nextId } from '../../lib/db';
import { Student } from '../../types';
import { Card, Button, Modal, Input } from '../../components/ui/Common';
import { UserPlus, Upload, Trash2, Key, Search, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

const StudentManage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStudents(readDb().students);
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.includes(search) || s.student_id.includes(search)
  ).sort((a, b) => a.student_id.localeCompare(b.student_id));

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setStudentId(student.student_id);
      setStudentName(student.name);
    } else {
      setEditingStudent(null);
      setStudentId('');
      setStudentName('');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!studentId || !studentName) {
      toast.error('请填写必要项');
      return;
    }

    const db = readDb();
    if (editingStudent) {
      const idx = db.students.findIndex(s => s.id === editingStudent.id);
      db.students[idx] = { ...editingStudent, student_id: studentId, name: studentName };
      toast.success('学生信息已更新');
    } else {
      if (db.students.some(s => s.student_id === studentId)) {
        toast.error('学号已存在');
        return;
      }
      db.students.push({
        id: nextId(db, 'student'),
        student_id: studentId,
        name: studentName,
        password: studentId
      });
      toast.success('学生已添加');
    }
    writeDb(db);
    setStudents(db.students);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('确认删除此学生吗？这将同时清理其所有提交和互动记录。')) return;
    const db = readDb();
    db.students = db.students.filter(s => s.id !== id);
    db.submissions = db.submissions.filter(s => s.student_db_id !== id);
    db.interactions = db.interactions.filter(i => i.student_db_id !== id);
    writeDb(db);
    setStudents(db.students);
    toast.info('学生已删除');
  };

  const handleResetPassword = (id: number) => {
    const db = readDb();
    const student = db.students.find(s => s.id === id);
    if (!student) return;
    const newPwd = Math.random().toString(36).slice(-8);
    student.password = newPwd;
    writeDb(db);
    setStudents(db.students);
    toast.success(`${student.name} 的密码已重置为: ${newPwd}`, { duration: 10000 });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const db = readDb();
      let count = 0;

      lines.forEach(line => {
        const [id, name] = line.split(',').map(s => s.trim());
        if (id && name && !db.students.some(s => s.student_id === id)) {
          db.students.push({
            id: nextId(db, 'student'),
            student_id: id,
            name: name,
            password: id
          });
          count++;
        }
      });

      writeDb(db);
      setStudents(db.students);
      toast.success(`成功导入 ${count} 名新学生`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">学籍管理</h2>
            <p className="text-gray-500 mt-1 font-medium">录入学生信息，维护班级名单</p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="px-5 py-3 rounded-2xl border border-gray-200">
              <Upload size={18} className="mr-2" /> 导入 CSV
            </Button>
            <Button onClick={() => openModal()} className="px-5 py-3 rounded-2xl">
              <UserPlus size={18} className="mr-2" /> 添加学生
            </Button>
          </div>
        </div>

        <div className="relative group max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
            <Search size={18} />
          </div>
          <Input 
            className="pl-11 h-12 bg-white border-gray-100 shadow-sm focus:border-blue-400 rounded-2xl" 
            placeholder="搜索姓名或学号..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <Card key={student.id} className="p-6 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold shadow-inner">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{student.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{student.student_id}</p>
                  </div>
                </div>
                <button onClick={() => openModal(student)} className="p-2 text-gray-300 hover:text-blue-600 flex-shrink-0 transition-colors">
                  <Edit3 size={18} />
                </button>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">操作</span>
                   <div className="flex gap-2">
                     <Button variant="ghost" size="sm" className="text-gray-400 hover:text-amber-600" onClick={() => handleResetPassword(student.id)} title="重置密码">
                       <Key size={16} />
                     </Button>
                     <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500" onClick={() => handleDelete(student.id)} title="删除学生">
                       <Trash2 size={16} />
                     </Button>
                   </div>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredStudents.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 font-medium">
              未找到符合条件的学籍记录。
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? '修改学籍' : '录入学籍'}
      >
        <div className="space-y-5">
           <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">学号 (User ID)</label>
            <Input 
              placeholder="请输入学号" 
              value={studentId} 
              onChange={e => setStudentId(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">学生姓名</label>
            <Input 
              placeholder="请输入姓名" 
              value={studentName} 
              onChange={e => setStudentName(e.target.value)} 
            />
          </div>
          {!editingStudent && (
             <p className="text-[11px] text-gray-400 italic font-medium pt-1">
               * 新录入学生的初始密码默认设置为其学号。
             </p>
          )}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button variant="primary" className="flex-1 rounded-2xl" onClick={handleSave}>确认并保存</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default StudentManage;
