import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { Assignment, Submission } from '../../types';
import { Card, Badge, Button } from '../../components/ui/Common';
import { formatFullDate, cn } from '../../lib/utils';
import { FileText, ChevronRight, MessageSquare, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const AssignmentList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [interactions, setInteractions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = readDb();
    setAssignments(db.assignments);
    setSubmissions(db.submissions.filter(s => s.student_db_id === user?.id));
    setInteractions(db.interactions.filter(i => i.student_db_id === user?.id).length);
    setIsLoading(false);
  }, [user?.id]);

  const getSubmissionStatus = (assignmentId: number) => {
    const studentSubmissions = submissions
      .filter(s => s.assignment_id === assignmentId)
      .sort((a, b) => b.version - a.version);
    
    return studentSubmissions[0] || null;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">我的作业</h2>
            <p className="text-gray-500 mt-1 font-medium">查看并提交您的课程任务，跟进学术进度</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:scale-[1.02] cursor-default group">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">课堂互动</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{interactions} <span className="text-sm font-medium text-gray-400">次记录</span></p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignments.map((item, index) => {
              const latestSubmission = getSubmissionStatus(item.id);
              const deadline = new Date(item.deadline);
              const isOverdue = new Date() > deadline && !latestSubmission;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:border-blue-200 transition-colors group">
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
                          latestSubmission ? "bg-blue-50 text-blue-600" : (isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400")
                        )}>
                          <FileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate pr-4 group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-lg border",
                              isOverdue ? "text-red-600 bg-red-50 border-red-100" : "text-gray-500 bg-gray-50 border-gray-100"
                            )}>
                              截止: {formatFullDate(item.deadline)}
                            </span>
                            {latestSubmission && (
                              <Badge variant={latestSubmission.is_graded ? "success" : "info"}>
                                {latestSubmission.is_graded ? `得分: ${latestSubmission.score}` : "待批改"}
                              </Badge>
                            )}
                            {latestSubmission && (
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                已提交 v{latestSubmission.version}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {latestSubmission && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assignments/${item.id}/submissions`)}
                            className="hidden sm:inline-flex"
                          >
                            <History size={16} className="mr-2" /> 提交历史
                          </Button>
                        )}
                        <Button
                          variant={latestSubmission ? "outline" : "primary"}
                          onClick={() => navigate(`/assignments/${item.id}`)}
                          className="px-6"
                        >
                          {latestSubmission ? '重新提交' : '进行提交'}
                          <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AssignmentList;
