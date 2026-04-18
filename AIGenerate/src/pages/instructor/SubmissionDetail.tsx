import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb, writeDb } from '../../lib/db';
import { Submission, Assignment } from '../../types';
import { Card, Button, Modal, Input, Badge } from '../../components/ui/Common';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronRight, FileDown, User, Clock, AlertCircle } from 'lucide-react';
import { formatFullDate, cn } from '../../lib/utils';
import { toast } from 'sonner';

const SubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const db = readDb();
    const list = db.submissions.filter(s => s.assignment_id === Number(id));
    const item = db.assignments.find(a => a.id === Number(id));
    
    // Group by student and take latest
    const grouped = list.reduce((acc, curr) => {
      if (!acc[curr.student_db_id] || acc[curr.student_db_id].version < curr.version) {
        acc[curr.student_db_id] = curr;
      }
      return acc;
    }, {} as Record<number, Submission>);

    setSubmissions(Object.values(grouped).sort((a, b) => a.student_id.localeCompare(b.student_id)));
    if (item) setAssignment(item);
  }, [id]);

  const openGradeModal = (sub: Submission) => {
    setSelectedSubmission(sub);
    setScore(sub.score?.toString() || '');
    setIsModalOpen(true);
  };

  const handleGrade = () => {
    if (!selectedSubmission || !score) return;
    
    const numericScore = parseInt(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      toast.error('请输入 0-100 之间的有效分数');
      return;
    }

    const db = readDb();
    // Update all versions of this student for this assignment or just this specific one?
    // Usually we update the specific submission selected.
    const subIdx = db.submissions.findIndex(s => s.id === selectedSubmission.id);
    db.submissions[subIdx] = {
      ...selectedSubmission,
      is_graded: true,
      score: numericScore
    };

    writeDb(db);
    setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, is_graded: true, score: numericScore } : s));
    setIsModalOpen(false);
    toast.success(`已为 ${selectedSubmission.student_name} 录入成绩: ${numericScore}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/admin/assignments')}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm group"
        >
          <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" /> 返回作业管理
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-2 inline-block">提交清单</span>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">{assignment?.title || "作业详情"}</h2>
            <p className="text-gray-400 font-medium text-sm mt-1 italic">显示每位学生最后一次提交的版本</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2">
             <CheckCircle2 size={16} className="text-emerald-500" />
             <span className="text-xs font-bold text-emerald-800 tracking-tight">已评分: {submissions.filter(s => s.is_graded).length} / {submissions.length}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className="p-0 border-none shadow-xl shadow-blue-900/5 group hover:shadow-blue-900/10 transition-shadow">
              <div className="flex flex-col lg:flex-row">
                {/* Left: Student Info */}
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-50 lg:w-72 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-inner ring-4 ring-white">
                      {sub.student_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{sub.student_name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sub.student_id}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={14} />
                      <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">{formatFullDate(sub.time)} 提交</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Files */}
                <div className="p-6 flex-1 bg-gray-50/30">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">递交附件 (v{sub.version})</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {sub.files.map((file, fidx) => (
                       <div key={fidx} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group shadow-sm hover:border-blue-200 transition-colors cursor-pointer">
                         <span className="text-xs font-bold text-gray-700 truncate">{file.filename}</span>
                         <FileDown size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                       </div>
                     ))}
                   </div>
                </div>

                {/* Right: Grade */}
                <div className="p-6 lg:w-48 shrink-0 flex flex-col justify-center items-center bg-white">
                  {sub.is_graded ? (
                    <div className="text-center group">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors leading-none">获得评分</p>
                      <span className="text-4xl font-black text-blue-600 leading-tight tracking-tighter">{sub.score}</span>
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="sm" onClick={() => openGradeModal(sub)} className="text-[10px] font-bold h-7 px-3">修改分数</Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={() => openGradeModal(sub)}
                      className="rounded-2xl px-6 py-3 w-full animate-pulse hover:animate-none"
                    >
                      评定分值
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {submissions.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 font-medium">
              该作业暂无递交记录。
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`评定作业: ${selectedSubmission?.student_name}`}
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4">
             <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
             <div className="min-w-0">
               <p className="text-xs font-bold text-amber-900 tracking-tight">评分建议</p>
               <p className="text-[11px] text-amber-700 mt-1 leading-normal font-medium">
                 请综合查看该学生提交的 v{selectedSubmission?.version} 版附件。
                 评分一旦保存，学生将可以立即在“我的作业”中查看到分值通知。
               </p>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">百分制得分 (0-100)</label>
            <div className="flex gap-4">
              <Input
                autoFocus
                type="number"
                min="0"
                max="100"
                className="h-14 text-2xl font-black text-center text-blue-600 rounded-2xl"
                value={score}
                onChange={e => setScore(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setScore('95')} className="px-3 rounded-xl bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 border border-gray-100 transition-colors">优秀 (95)</button>
                 <button onClick={() => setScore('85')} className="px-3 rounded-xl bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition-colors">良好 (85)</button>
                 <button onClick={() => setScore('75')} className="px-3 rounded-xl bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-amber-50 hover:text-amber-600 border border-gray-100 transition-colors">合格 (75)</button>
                 <button onClick={() => setScore('60')} className="px-3 rounded-xl bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-100 transition-colors">及格 (60)</button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button variant="primary" className="flex-1 rounded-2xl" onClick={handleGrade}>确认录入</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default SubmissionDetail;
