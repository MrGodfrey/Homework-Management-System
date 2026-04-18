import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Submission, Assignment } from '../../types';
import { Card, Badge, Button } from '../../components/ui/Common';
import { formatFullDate } from '../../lib/utils';
import { ArrowLeft, History, FileDown, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

const SubmissionHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = readDb();
    const list = db.submissions
      .filter(s => s.assignment_id === Number(id) && s.student_db_id === user?.id)
      .sort((a, b) => b.version - a.version);
    const item = db.assignments.find(a => a.id === Number(id));
    
    setSubmissions(list);
    if (item) setAssignment(item);
    setIsLoading(false);
  }, [id, user?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/assignments')}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm group"
        >
          <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" /> 返回作业列表
        </button>

        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">提交历史</h2>
            <p className="text-gray-500 font-medium">{assignment?.title || "作业详情"}</p>
          </div>
        </div>

        {isLoading ? (
          <p>加载中...</p>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 italic text-gray-400">
            尚未提交此项作业。
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub, idx) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={cn(
                  "p-6 transition-all",
                  idx === 0 ? "ring-2 ring-blue-600/5 border-blue-200" : "opacity-80 hover:opacity-100"
                )}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        sub.is_graded ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {sub.is_graded ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">版本 v{sub.version}</h3>
                          {idx === 0 && <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Latest</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 underline-offset-4 decoration-gray-200">
                          <span className="text-xs text-gray-500">提交于 {formatFullDate(sub.time)}</span>
                          <Badge variant={sub.is_graded ? "success" : "info"}>
                            {sub.is_graded ? `得分: ${sub.score}` : "待批改"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">附件文件</h4>
                      {sub.files.map((file, fidx) => (
                        <div key={fidx} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white transition-colors cursor-pointer group">
                           <span className="text-xs font-semibold text-gray-700 truncate mr-2">{file.filename}</span>
                           <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600">
                             <FileDown size={16} />
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SubmissionHistory;

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
