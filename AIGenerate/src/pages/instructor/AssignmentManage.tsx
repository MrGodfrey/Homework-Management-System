import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb, writeDb, nextId } from '../../lib/db';
import { Assignment } from '../../types';
import { Card, Button, Modal, Input, Badge } from '../../components/ui/Common';
import { formatFullDate, cn } from '../../lib/utils';
import { Plus, Edit2, Trash2, Calendar, FileType, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AssignmentManage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [allowLate, setAllowLate] = useState(false);
  const [fileRules, setFileRules] = useState('.pdf,.docx,.md,.zip');

  useEffect(() => {
    setAssignments(readDb().assignments);
  }, []);

  const openModal = (assign?: Assignment) => {
    if (assign) {
      setEditingAssignment(assign);
      setTitle(assign.title);
      setDescription(assign.description);
      setDeadline(assign.deadline.slice(0, 16)); // Format for datetime-local input
      setAllowLate(assign.allow_late);
      setFileRules(assign.file_rules);
    } else {
      setEditingAssignment(null);
      setTitle('');
      setDescription('');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDeadline(defaultDate.toISOString().slice(0, 16));
      setAllowLate(false);
      setFileRules('.pdf,.docx,.md,.zip');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!title || !deadline) {
      toast.error('请填写必要项');
      return;
    }

    const db = readDb();
    if (editingAssignment) {
      const idx = db.assignments.findIndex(a => a.id === editingAssignment.id);
      db.assignments[idx] = {
        ...editingAssignment,
        title,
        description,
        deadline: new Date(deadline).toISOString(),
        allow_late: allowLate,
        file_rules: fileRules
      };
      toast.success('作业已更新');
    } else {
      const newAssign: Assignment = {
        id: nextId(db, 'assignment'),
        title,
        description,
        deadline: new Date(deadline).toISOString(),
        allow_late: allowLate,
        file_rules: fileRules,
        attachment_files: []
      };
      db.assignments.push(newAssign);
      toast.success('作业已发布');
    }
    writeDb(db);
    setAssignments(db.assignments);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('确认删除此作业及所有相关的提交记录吗？')) return;
    const db = readDb();
    db.assignments = db.assignments.filter(a => a.id !== id);
    db.submissions = db.submissions.filter(s => s.assignment_id !== id);
    writeDb(db);
    setAssignments(db.assignments);
    toast.info('作业已删除');
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">作业管理</h2>
            <p className="text-gray-500 mt-1 font-medium">设计任务、设定截止时间并管理附件</p>
          </div>
          <Button onClick={() => openModal()} className="px-6 py-4 rounded-2xl">
            <Plus size={20} className="mr-2" /> 发布新任务
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {assignments.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900 truncate">{item.title}</h3>
                    <Badge variant={item.allow_late ? "success" : "danger"}>
                       {item.allow_late ? "允许迟交" : "严格限时"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><Calendar size={16} /> 截止于 {formatFullDate(item.deadline)}</span>
                    <span className="flex items-center gap-1.5"><FileType size={16} /> 要求: {item.file_rules}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate mt-1">{item.description || "暂无描述"}</p>
                </div>

                <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                  <Button variant="outline" size="sm" onClick={() => openModal(item)}>
                    <Edit2 size={16} className="mr-2" /> 编辑
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? '编辑任务' : '发布新任务'}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">作业标题</label>
            <Input 
              placeholder="例如：第 5 次作业：用户体验分析" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">详细描述</label>
            <textarea
              className="w-full min-h-[100px] rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
              placeholder="说明作业的具体要求和注意事项..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">截止日期时间</label>
              <Input 
                type="datetime-local" 
                value={deadline} 
                onChange={e => setDeadline(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">文件规则 (后缀名)</label>
              <Input 
                placeholder=".pdf,.zip,.docx" 
                value={fileRules} 
                onChange={e => setFileRules(e.target.value)} 
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-white transition-colors group">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500" 
              checked={allowLate}
              onChange={e => setAllowLate(e.target.checked)}
            />
            <div className="min-w-0">
               <p className="text-sm font-bold text-gray-900 leading-tight">允许迟交</p>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">开启后学生在截止时间后仍可上传，但会标记为迟交状态</p>
            </div>
            {allowLate ? <CheckCircle2 size={24} className="ml-auto text-emerald-500" /> : <XCircle size={24} className="ml-auto text-gray-300 group-hover:text-red-400 transition-colors" />}
          </label>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button variant="primary" className="flex-1 rounded-2xl" onClick={handleSave}>确认并保存</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default AssignmentManage;
