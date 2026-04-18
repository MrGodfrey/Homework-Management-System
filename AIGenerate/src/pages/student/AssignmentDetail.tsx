import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/ui/Layout';
import { readDb, writeDb, nextId, delay } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Assignment, SubmissionFile } from '../../types';
import { Card, Button, Badge } from '../../components/ui/Common';
import { formatFullDate, cn } from '../../lib/utils';
import { ArrowLeft, Upload, File, Trash2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const db = readDb();
    const item = db.assignments.find(a => a.id === Number(id));
    if (item) {
      setAssignment(item);
    }
    setIsLoading(false);
  }, [id]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: assignment?.file_rules 
      ? assignment.file_rules.split(',').reduce((acc, curr) => ({ ...acc, [curr.trim()]: [] }), {}) 
      : undefined
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    await delay(1000); // Simulate network latency

    const db = readDb();
    const currentSubmissions = db.submissions.filter(
      s => s.assignment_id === Number(id) && s.student_db_id === user?.id
    );
    const nextVersion = currentSubmissions.length + 1;

    const submissionFiles: SubmissionFile[] = files.map(f => ({
      filename: f.name,
      content: "File content mock",
      mime: f.type
    }));

    db.submissions.push({
      id: nextId(db, 'submission'),
      assignment_id: Number(id),
      student_db_id: user?.id || 0,
      student_id: user?.student_id || '',
      student_name: user?.name || '',
      version: nextVersion,
      time: new Date().toISOString(),
      is_graded: false,
      score: null,
      files: submissionFiles
    });

    writeDb(db);
    setIsUploading(false);
    toast.success(`成功提交版本 v${nextVersion}`);
    navigate(`/assignments/${id}/submissions`);
  };

  if (isLoading) return <Layout>加载中...</Layout>;
  if (!assignment) return <Layout>找不到作业</Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/assignments')}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm group"
        >
          <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" /> 返回作业列表
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info */}
          <div className="lg:col-span-2 space-y-6">
            <header>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">{assignment.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge variant="info">截止日期: {formatFullDate(assignment.deadline)}</Badge>
                <Badge variant={assignment.allow_late ? "success" : "danger"}>
                  {assignment.allow_late ? "允许迟交" : "不接受迟交"}
                </Badge>
              </div>
            </header>

            <Card className="p-8">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-blue-600" /> 作业说明
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{assignment.description || "暂无详细说明。"}</p>
              
              {assignment.attachment_files.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">参考附件</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignment.attachment_files.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-colors hover:border-blue-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                            <File size={20} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 truncate">{file.filename}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-white transition-all">
                          <ExternalLink size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Upload */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> 递交您的作业
              </h3>
              
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                  isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
                  <Upload size={24} />
                </div>
                {isDragActive ? (
                  <p className="text-blue-600 font-bold text-sm">放开以添加文件</p>
                ) : (
                  <>
                    <p className="text-gray-900 font-bold text-sm">点击或拖拽文件至此</p>
                    <p className="text-gray-400 text-xs mt-1 font-medium italic">支援格式: {assignment.file_rules || "不限"}</p>
                  </>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">待上传列表</h4>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100 group animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <File size={16} className="text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full mt-6 py-6 rounded-2xl text-base font-bold shadow-lg shadow-blue-200"
                disabled={files.length === 0}
                loading={isUploading}
                onClick={handleUpload}
              >
                <CheckCircle2 size={18} className="mr-2" /> 确认提交
              </Button>
            </Card>

            <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0 mt-1">
                <CheckCircle2 size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800 tracking-tight">已开启版本管理</p>
                <p className="text-[11px] text-emerald-600 mt-1 leading-normal font-medium">您可以多次递交作业，系统将保留所有历史版本，教师默认查阅最新一次递交的内容。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AssignmentDetail;
