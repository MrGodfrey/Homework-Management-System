import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb, writeDb, nextId } from '../../lib/db';
import { Student, Assignment, Database } from '../../types';
import { Card, Button, Modal, Input } from '../../components/ui/Common';
import { cn } from '../../lib/utils';
import { Plus, MoreHorizontal, Check, X, MessageSquarePlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [db, setDb] = useState<Database | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [interactionNote, setInteractionNote] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setDb(readDb());
  }, []);

  if (!db) return <Layout>加载中...</Layout>;

  const handleAddInteraction = () => {
    if (!selectedStudent) return;
    
    const newDb = readDb();
    newDb.interactions.push({
      id: nextId(newDb, 'interaction'),
      student_db_id: selectedStudent.id,
      created_at: new Date().toISOString(),
      note: interactionNote || null
    });
    writeDb(newDb);
    setDb(newDb);
    setIsModalOpen(false);
    setInteractionNote('');
    toast.success(`已为 ${selectedStudent.name} 添加互动记录`);
  };

  const getLatestSubmission = (studentId: number, assignmentId: number) => {
    const list = db.submissions.filter(s => s.student_db_id === studentId && s.assignment_id === assignmentId);
    if (list.length === 0) return null;
    return list.sort((a, b) => b.version - a.version)[0];
  };

  return (
    <Layout>
      <div className="space-y-8">
        <header>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">课程看板</h2>
          <p className="text-gray-500 mt-1 font-medium">全景式监控学生进度与课堂互动态势</p>
        </header>

        <Card className="overflow-x-auto border-none shadow-xl shadow-blue-900/5">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky left-0 bg-white z-10 w-48">学生信息</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-24">互动</th>
                {db.assignments.map(a => (
                  <th key={a.id} className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center group cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate(`/admin/assignments/${a.id}/submissions`)}>
                    {a.title.split('：')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {db.students.map(student => {
                const studentInteractions = db.interactions.filter(i => i.student_db_id === student.id).length;
                
                return (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-all z-10 border-r border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold ring-2 ring-white">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate leading-tight">{student.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{student.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-black text-blue-600">{studentInteractions}</span>
                        <button 
                          onClick={() => { setSelectedStudent(student); setIsModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 transition-all shadow-none hover:shadow-sm"
                        >
                          <MessageSquarePlus size={14} />
                        </button>
                      </div>
                    </td>
                    {db.assignments.map(assignment => {
                      const sub = getLatestSubmission(student.id, assignment.id);
                      return (
                        <td key={assignment.id} className="p-5 text-center">
                          {sub ? (
                            <button 
                              onClick={() => navigate(`/admin/assignments/${assignment.id}/submissions`)}
                              className={cn(
                                "mx-auto w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm border",
                                sub.is_graded 
                                  ? "bg-emerald-500 text-white border-emerald-400" 
                                  : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white"
                              )}
                            >
                              {sub.is_graded ? (
                                <span className="text-xs font-black leading-none">{sub.score}</span>
                              ) : (
                                <span className="text-[10px] font-black leading-none uppercase">v{sub.version}</span>
                              )}
                              {sub.is_graded ? (
                                <Check size={10} strokeWidth={4} className="mt-0.5" />
                              ) : (
                                <MoreHorizontal size={14} className="mt-0.5" />
                              )}
                            </button>
                          ) : (
                            <div className="mx-auto w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 italic font-medium text-[10px]">
                              N/A
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-xs font-bold uppercase tracking-widest text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span>已评分</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-50 border border-blue-100" />
            <span className="text-blue-600">待评分</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
            <span>未提交</span>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`记录与 ${selectedStudent?.name} 的互动`}
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
             <MessageSquare className="text-blue-600 flex-shrink-0" size={20} />
             <p className="text-xs text-blue-700 leading-normal">
               您可以在此处记录学生在课堂上的积极表现或其特长，这些记录将作为平时成绩的重要参考依据。
             </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">备注情况 (可选)</label>
            <textarea
              className="w-full min-h-[120px] rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="例如：主动回答问题、演示思路清晰..."
              value={interactionNote}
              onChange={(e) => setInteractionNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddInteraction}>保存记录</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Dashboard;
