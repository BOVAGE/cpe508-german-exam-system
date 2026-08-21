import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { 
  ArrowLeft, 
  Layers, 
  HelpCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Users, 
  Download, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const ExamDetails: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'topics' | 'questions' | 'config' | 'participants' | 'settings'>('topics');

  // Modal control states
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [topicModalType, setTopicModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [editTopicItem, setEditTopicItem] = useState<any | null>(null);
  const [topicForm, setTopicForm] = useState({ title: '', description: '' });

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionModalType, setQuestionModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [editQuestionItem, setEditQuestionItem] = useState<any | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    topicId: string;
    questionText: string;
    previousQuestionId?: string;
    hasDependency: boolean;
    gaps: Array<{ position: number; points: number; acceptedAnswers: string[]; rawAnswersText?: string }>;
  }>({
    topicId: '',
    questionText: '',
    hasDependency: false,
    gaps: []
  });

  // Participant states
  const [participantFile, setParticipantFile] = useState<File | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantRegNum, setParticipantRegNum] = useState('');
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Fetch Exam configuration details (which pulls topics, questions, gaps)
  const { data: exam, isLoading: loadingExam } = useQuery({
    queryKey: ['exams', examId],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}`);
      return res.data;
    }
  });

  // Fetch all registered student users to allow search & register
  const { data: students = [] } = useQuery({
    queryKey: ['users', 'STUDENT'],
    queryFn: async () => {
      const res = await api.get('/users?role=STUDENT');
      return res.data;
    }
  });

  // Fetch registered participants for this exam
  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ['participants', examId],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}/participants`);
      return res.data;
    }
  });

  // Fetch topic distribution configurations
  const { data: topicConfigs = [] } = useQuery({
    queryKey: ['exams', examId, 'configs'],
    queryFn: async () => {
      const examData = await api.get(`/exams/${examId}`);
      return examData.data.topicConfigs || [];
    }
  });

  const [drawCounts, setDrawCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (topicConfigs && topicConfigs.length > 0) {
      const initialCounts: Record<string, number> = {};
      topicConfigs.forEach((c: any) => {
        initialCounts[c.topicId] = c.questionCount;
      });
      setDrawCounts(initialCounts);
    } else if (exam && exam.topics) {
      const initialCounts: Record<string, number> = {};
      exam.topics.forEach((t: any) => {
        initialCounts[t.id] = 0;
      });
      setDrawCounts(initialCounts);
    }
  }, [topicConfigs, exam]);

  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  const toggleTopicCollapse = (topicId: string) => {
    setCollapsedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const [settingsForm, setSettingsForm] = useState<any>({
    title: '',
    description: '',
    academicYear: '',
    session: '',
    examKind: '',
    scheduledStart: '',
    scheduledEnd: '',
    duration: 60,
    gradingMode: '',
    status: '',
  });

  useEffect(() => {
    if (exam) {
      const formatLocalDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setSettingsForm({
        title: exam.title || '',
        description: exam.description || '',
        academicYear: exam.academicYear || '',
        session: exam.session || '',
        examKind: exam.examKind || '',
        scheduledStart: formatLocalDateTime(exam.scheduledStart),
        scheduledEnd: formatLocalDateTime(exam.scheduledEnd),
        duration: exam.duration || 60,
        gradingMode: exam.gradingMode || '',
        status: exam.status || '',
      });
    }
  }, [exam]);

  const updateExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        scheduledStart: new Date(data.scheduledStart).toISOString(),
        scheduledEnd: new Date(data.scheduledEnd).toISOString(),
      };
      return api.patch(`/exams/${examId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', examId] });
      alert('Examination settings updated successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update examination details. Make sure there are no active student attempts.');
    }
  });

  // Automatically parse questionText gaps positions
  useEffect(() => {
    const matches = [...questionForm.questionText.matchAll(/\{\{gap:(\d+)\}\}/g)];
    const foundPositions = Array.from(new Set(matches.map(m => parseInt(m[1])))).sort((a, b) => a - b);
    
    setQuestionForm(prev => {
      const updatedGaps = foundPositions.map(pos => {
        const existing = prev.gaps.find(g => g.position === pos);
        if (existing) return existing;
        return { position: pos, points: 1.0, acceptedAnswers: [], rawAnswersText: '' };
      });
      return { ...prev, gaps: updatedGaps };
    });
  }, [questionForm.questionText]);

  // General Topics CRUD mutations
  const topicMutation = useMutation({
    mutationFn: async ({ method, path, id, data }: { method: 'post' | 'patch' | 'delete'; path: string; id?: string; data?: any }) => {
      if (method === 'post') return api.post(path, data);
      if (method === 'patch') return api.patch(`${path}/${id}`, data);
      return api.delete(`${path}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', examId] });
      setTopicModalOpen(false);
      setTopicForm({ title: '', description: '' });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Topic CRUD operation failed.');
    }
  });

  // Questions CRUD mutations
  const questionMutation = useMutation({
    mutationFn: async ({ method, id, data }: { method: 'post' | 'patch' | 'delete'; id?: string; data?: any }) => {
      if (method === 'post') return api.post('/questions', data);
      if (method === 'patch') return api.patch(`/questions/${id}`, data);
      return api.delete(`/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', examId] });
      setQuestionModalOpen(false);
      setQuestionForm({ topicId: '', questionText: '', hasDependency: false, gaps: [] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Question CRUD operation failed.');
    }
  });

  // Topic Distribution Configurations mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: { topicId: string; questionCount: number }) => {
      return api.post('/exams/topic-configs', { examId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', examId] });
      alert('Question distribution config saved successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save question count distribution. Linear chain requirements might not be met.');
    }
  });

  // Participants registration mutations
  const registerParticipantMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return api.post('/exams/participants', { examId, studentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', examId] });
      setParticipantRegNum('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to register student.');
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return api.delete(`/exams/${examId}/participants/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', examId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to remove participant.');
    }
  });

  // Excel bulk participant import
  const handleParticipantExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantFile) return;
    setImportLoading(true);
    setImportResult(null);
    setImportError(null);

    const data = new FormData();
    data.append('file', participantFile);

    try {
      const res = await api.post(`/exams/${examId}/import-participants`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult(res.data);
      setParticipantFile(null);
      queryClient.invalidateQueries({ queryKey: ['participants', examId] });
    } catch (err: any) {
      setImportError(
        err.response?.data?.message || 
        'Failed to import sheet. Ensure registration numbers are correct.'
      );
    } finally {
      setImportLoading(false);
    }
  };

  // Results Excel Download triggers
  const handleResultsExport = async () => {
    try {
      const response = await api.get(`/exams/${examId}/export-results`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_results_${examId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to download results workbook. Check that student attempts have been submitted.');
    }
  };

  // Forms mapping helpers
  const handleOpenCreateTopic = () => {
    setTopicModalType('create');
    setTopicForm({ title: '', description: '' });
    setTopicModalOpen(true);
  };

  const handleOpenEditTopic = (topic: any) => {
    setTopicModalType('edit');
    setEditTopicItem(topic);
    setTopicForm({ title: topic.title, description: topic.description || '' });
    setTopicModalOpen(true);
  };

  const handleOpenDeleteTopic = (topic: any) => {
    setTopicModalType('delete');
    setEditTopicItem(topic);
    setTopicModalOpen(true);
  };

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicModalType === 'create') {
      topicMutation.mutate({ method: 'post', path: '/topics', data: { examId, ...topicForm } });
    } else if (topicModalType === 'edit') {
      topicMutation.mutate({ method: 'patch', path: '/topics', id: editTopicItem.id, data: topicForm });
    }
  };

  const handleTopicDeleteConfirm = () => {
    topicMutation.mutate({ method: 'delete', path: '/topics', id: editTopicItem.id });
  };

  // Questions modal mapping helpers
  const handleOpenCreateQuestion = () => {
    setQuestionModalType('create');
    setQuestionForm({
      topicId: exam.topics?.[0]?.id || '',
      questionText: '',
      hasDependency: false,
      gaps: []
    });
    setQuestionModalOpen(true);
  };

  const handleInsertGap = () => {
    const matches = [...questionForm.questionText.matchAll(/\{\{gap:(\d+)\}\}/g)];
    const existingNums = matches.map(m => parseInt(m[1]));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const gapToken = `{{gap:${nextNum}}}`;

    const textarea = document.getElementById('question-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = questionForm.questionText;
      const newText = text.substring(0, start) + gapToken + text.substring(end);
      
      setQuestionForm(prev => ({ ...prev, questionText: newText }));
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + gapToken.length, start + gapToken.length);
      }, 0);
    } else {
      setQuestionForm(prev => ({ ...prev, questionText: prev.questionText + gapToken }));
    }
  };

  const handleOpenEditQuestion = (q: any) => {
    setQuestionModalType('edit');
    setEditQuestionItem(q);
    setQuestionForm({
      topicId: q.topicId,
      questionText: q.questionText,
      previousQuestionId: q.previousQuestionId || '',
      hasDependency: !!q.previousQuestionId,
      gaps: q.gaps.map((gap: any) => ({
        position: gap.position,
        points: gap.points,
        acceptedAnswers: gap.acceptedAnswers.map((a: any) => a.answer),
        rawAnswersText: gap.acceptedAnswers.map((a: any) => a.answer).join(', ')
      }))
    });
    setQuestionModalOpen(true);
  };

  const handleOpenDeleteQuestion = (q: any) => {
    setQuestionModalType('delete');
    setEditQuestionItem(q);
    setQuestionModalOpen(true);
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      topicId: questionForm.topicId,
      questionText: questionForm.questionText,
      gaps: questionForm.gaps.map(g => ({
        position: g.position,
        points: g.points,
        acceptedAnswers: g.acceptedAnswers
      }))
    };
    if (questionForm.hasDependency && questionForm.previousQuestionId) {
      payload.previousQuestionId = questionForm.previousQuestionId;
    }

    if (questionModalType === 'create') {
      questionMutation.mutate({ method: 'post', data: payload });
    } else if (questionModalType === 'edit') {
      questionMutation.mutate({ method: 'patch', id: editQuestionItem.id, data: payload });
    }
  };

  const handleQuestionDeleteConfirm = () => {
    questionMutation.mutate({ method: 'delete', id: editQuestionItem.id });
  };

  const handleIndividualRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const found = students.find((s: any) => s.registrationNumber === participantRegNum);
    if (!found) {
      alert(`Student with registration number "${participantRegNum}" not found in system database.`);
      return;
    }
    registerParticipantMutation.mutate(found.id);
  };

  if (loadingExam) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Loading exam configuration panel...</p>
      </div>
    );
  }

  // Helper lists for question dependencies
  const getOtherQuestionsInTopic = (topicId: string, currentQuestionId?: string) => {
    const topic = exam?.topics?.find((t: any) => t.id === topicId);
    if (!topic || !topic.questions) return [];
    return topic.questions.filter((q: any) => q.id !== currentQuestionId);
  };

  return (
    <div className="space-y-6">
      {/* Back to course link */}
      {exam && (
        <Link to={`/lecturer/courses/${exam.courseId}`} className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Course ({exam.course?.code})</span>
        </Link>
      )}

      {/* Control Board Header */}
      {exam && (
        <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
          
          <div className="space-y-2 relative z-10 text-left">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                {exam.course?.code}
              </span>
              <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded border ${
                exam.status === 'PUBLISHED' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {exam.status}
              </span>
            </div>
            <h1 className="text-2xl font-black">{exam.title}</h1>
            <p className="text-slate-400 text-sm">{exam.description || 'No description provided.'}</p>
          </div>

          <div className="flex gap-2 relative z-10">
            <button 
              onClick={handleResultsExport}
              className="glass-btn-secondary flex items-center space-x-2 text-xs py-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Excel Results</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 overflow-x-auto gap-2 pb-px">
        {[
          { key: 'topics', label: 'Topics CRUD', icon: Layers },
          { key: 'questions', label: 'Questions CRUD', icon: FileText },
          { key: 'config', label: 'Topic Distribution Settings', icon: Settings },
          { key: 'participants', label: 'Eligible Students', icon: Users },
          { key: 'settings', label: 'Exam Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all shrink-0
                ${activeTab === tab.key 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="animate-in fade-in duration-150">
        
        {/* TOPICS TAB */}
        {activeTab === 'topics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-300">Exam Topics</h2>
              <button 
                onClick={handleOpenCreateTopic}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Topic</span>
              </button>
            </div>

            {(!exam.topics || exam.topics.length === 0) ? (
              <div className="glass-panel p-10 text-center flex flex-col items-center justify-center space-y-4">
                <HelpCircle className="h-10 w-10 text-slate-600" />
                <p className="text-slate-500 text-xs">No topics configured yet for this examination.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {exam.topics.map((topic: any) => (
                  <div key={topic.id} className="glass-panel p-5 flex items-center justify-between text-left">
                    <div>
                      <h3 className="font-bold text-slate-200">{topic.title}</h3>
                      <p className="text-slate-400 text-xs mt-1">{topic.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditTopic(topic)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleOpenDeleteTopic(topic)} className="p-2 hover:bg-slate-800 rounded text-red-500/80 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-300 font-sans">Exam Questions</h2>
              <button 
                onClick={handleOpenCreateQuestion}
                disabled={!exam.topics || exam.topics.length === 0}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {(!exam.topics || exam.topics.length === 0) ? (
              <div className="glass-panel p-8 text-center text-slate-500 text-xs">
                Please create at least one Topic before designing questions.
              </div>
            ) : (
              <div className="space-y-8">
                {exam.topics.map((topic: any) => {
                  const questionsCount = topic.questions?.length || 0;
                  const isCollapsed = collapsedTopics[topic.id];
                  return (
                    <div key={topic.id} className="space-y-3 text-left">
                      {/* Collapsible Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleTopicCollapse(topic.id)}
                        className="w-full flex items-center justify-between py-2.5 border-b border-slate-800/80 hover:bg-slate-900/10 transition-colors group"
                      >
                        <div className="flex items-center space-x-2 text-left">
                          <span className="text-sm font-bold text-indigo-400 border-l-2 border-indigo-500 pl-2 uppercase tracking-wide">
                            {topic.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal lowercase">
                            ({questionsCount} {questionsCount === 1 ? 'question' : 'questions'})
                          </span>
                        </div>
                        <div className="text-slate-400 group-hover:text-slate-200 transition-colors pr-2">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {/* Questions List (Conditional Render) */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 gap-4 pt-1 animate-in fade-in duration-200">
                          {questionsCount === 0 ? (
                            <p className="text-xs text-slate-500 italic pl-2 py-2">
                              No questions seeded under this topic yet. Click "Add Question" above to begin.
                            </p>
                          ) : (
                            topic.questions.map((q: any) => (
                              <div key={q.id} className="glass-panel p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="space-y-2 max-w-3xl">
                                  <p className="text-sm text-slate-200 leading-relaxed font-mono">
                                    {q.questionText}
                                  </p>
                                  
                                  <div className="flex flex-wrap items-center gap-2">
                                    {q.previousQuestionId && (
                                      <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded">
                                        Chain Dependent
                                      </span>
                                    )}
                                    
                                    {q.gaps?.map((gap: any) => (
                                      <span key={gap.id} className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1.5">
                                        <span>Gap {gap.position}:</span>
                                        <span className="text-slate-300 font-mono font-bold">
                                          {gap.acceptedAnswers.map((a: any) => a.answer).join(' / ')}
                                        </span>
                                        <span className="text-indigo-400">({gap.points}pt)</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleOpenEditQuestion(q)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100">
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleOpenDeleteQuestion(q)} className="p-2 hover:bg-slate-800 rounded text-red-500/80 hover:text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TOPIC DISTRIBUTION CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <h2 className="text-md font-bold text-slate-300 text-left">Randomization Distribution Config</h2>
            <p className="text-slate-400 text-xs text-left leading-relaxed">
              Define the count of questions to be randomly selected from each topic block to assemble unique student exam sets. 
              The system will automatically validate linear chain structures when saving counts.
            </p>

            {(!exam.topics || exam.topics.length === 0) ? (
              <div className="glass-panel p-8 text-center text-slate-500 text-xs">
                Create topics and questions to modify counts.
              </div>
            ) : (
              <div className="glass-panel overflow-hidden mt-4">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Topic Title</th>
                      <th className="p-4">Total Seeded Questions</th>
                      <th className="p-4">Random Draw Count</th>
                      <th className="p-4 text-right">Save Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {exam.topics.map((topic: any) => {
                      const totalQ = topic.questions?.length || 0;
                      const drawCount = drawCounts[topic.id] || 0;

                      const handleSave = () => {
                        if (drawCount < 1) {
                          alert('Question count must be at least 1.');
                          return;
                        }
                        saveConfigMutation.mutate({ topicId: topic.id, questionCount: drawCount });
                      };

                      return (
                        <tr key={topic.id} className="hover:bg-slate-900/20">
                          <td className="p-4 font-semibold text-slate-200">{topic.title}</td>
                          <td className="p-4 text-slate-400 font-mono">{totalQ} questions</td>
                          <td className="p-4">
                            <input
                              type="number"
                              min={1}
                              max={totalQ || 1}
                              value={drawCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setDrawCounts(prev => ({ ...prev, [topic.id]: val }));
                              }}
                              className="glass-input w-28 py-1.5 px-3 font-mono"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={handleSave}
                              disabled={totalQ === 0 || drawCount === 0}
                              className="glass-btn-primary text-xs py-1.5 px-3"
                            >
                              Upsert Config
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ELIGIBLE STUDENTS TAB */}
        {activeTab === 'participants' && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: List of participants */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-300">Registered Student Participants</h3>
                  <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded">
                    {participants.length} Eligible
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter registered participants..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="glass-input w-full pl-11"
                  />
                </div>

                {loadingParticipants ? (
                  <div className="h-40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="glass-panel p-8 text-center text-slate-500 text-xs">
                    No student participants have been registered for this exam yet.
                  </div>
                ) : (
                  <div className="glass-panel max-h-[400px] overflow-y-auto divide-y divide-slate-800/60">
                    {participants
                      .filter((p: any) => 
                        p.student?.firstName.toLowerCase().includes(participantSearch.toLowerCase()) ||
                        p.student?.lastName.toLowerCase().includes(participantSearch.toLowerCase()) ||
                        p.student?.registrationNumber?.toLowerCase().includes(participantSearch.toLowerCase())
                      )
                      .map((p: any) => (
                        <div key={p.studentId} className="p-3.5 flex items-center justify-between hover:bg-slate-900/20">
                          <div>
                            <p className="font-bold text-xs text-slate-200">{p.student?.lastName}, {p.student?.firstName}</p>
                            <p className="text-[10px] font-mono text-indigo-400 mt-0.5">{p.student?.registrationNumber} • {p.student?.email}</p>
                          </div>
                          <button
                            onClick={() => removeParticipantMutation.mutate(p.studentId)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Right Column: Registrations & Import panels */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Individual registration form */}
                <div className="glass-panel p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Individual Register</h3>
                  
                  <form onSubmit={handleIndividualRegister} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Registration Number</label>
                      <input
                        type="text"
                        required
                        value={participantRegNum}
                        onChange={(e) => setParticipantRegNum(e.target.value)}
                        placeholder="e.g. CPE/2021/001"
                        className="glass-input w-full text-xs py-2 px-3"
                      />
                    </div>
                    <button type="submit" className="glass-btn-primary w-full text-xs py-2">
                      Register Student
                    </button>
                  </form>
                </div>

                {/* Bulk student import form */}
                <div className="glass-panel p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2 font-sans">Excel Bulk Import</h3>
                  
                  <form onSubmit={handleParticipantExcelImport} className="space-y-3">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Upload an Excel file containing a column named <span className="font-mono text-indigo-400">registration number</span>. All rows must exist in the users database.
                    </p>

                    <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center relative cursor-pointer min-h-[90px]">
                      <input 
                        type="file" 
                        accept=".xlsx"
                        required
                        onChange={(e) => setParticipantFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {participantFile ? (
                        <p className="text-xs font-semibold text-indigo-400 text-center truncate w-full px-2">{participantFile.name}</p>
                      ) : (
                        <p className="text-[10px] text-slate-500 text-center">Click to select participant sheet (.xlsx)</p>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={importLoading || !participantFile}
                      className="glass-btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      {importLoading ? 'Importing...' : 'Upload Excel Sheet'}
                    </button>
                  </form>

                  {/* Feedback Banner */}
                  {importResult && (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-400 flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Import Complete</p>
                        <p className="mt-0.5">{importResult.importedCount} student participants registered successfully.</p>
                      </div>
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-[10px] text-red-400 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Import Failed</p>
                        <p className="mt-0.5">{importError}</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* EXAM SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 md:p-8 space-y-6 text-left max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-bold text-slate-200">Examination Settings</h2>
              <p className="text-slate-400 text-xs mt-1">Configure scheduling parameters, spelling grading modes, and lifecycle status.</p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                updateExamMutation.mutate(settingsForm);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Examination Title</label>
                <input 
                  type="text" 
                  required
                  value={settingsForm.title} 
                  onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="glass-input w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Description / Instructions</label>
                <textarea 
                  value={settingsForm.description} 
                  onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="glass-input w-full min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Academic Year</label>
                  <input 
                    type="text" 
                    required
                    value={settingsForm.academicYear} 
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, academicYear: e.target.value }))}
                    className="glass-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Session</label>
                  <select
                    value={settingsForm.session}
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, session: e.target.value }))}
                    className="glass-input w-full bg-slate-950"
                  >
                    <option value="Harmattan">Harmattan</option>
                    <option value="Rain">Rain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Exam Kind</label>
                  <select
                    value={settingsForm.examKind}
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, examKind: e.target.value }))}
                    className="glass-input w-full bg-slate-950"
                  >
                    <option value="MID_SEMESTER">Mid Semester</option>
                    <option value="END_OF_SEMESTER">End Semester</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={settingsForm.duration} 
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="glass-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Grading Mode</label>
                  <select
                    value={settingsForm.gradingMode}
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, gradingMode: e.target.value }))}
                    className="glass-input w-full bg-slate-950"
                  >
                    <option value="NON_STRICT">Non-Strict</option>
                    <option value="STRICT">Strict</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Scheduled Start</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={settingsForm.scheduledStart} 
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, scheduledStart: e.target.value }))}
                    className="glass-input w-full text-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Scheduled End</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={settingsForm.scheduledEnd} 
                    onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, scheduledEnd: e.target.value }))}
                    className="glass-input w-full text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Examination Status</label>
                <select
                  value={settingsForm.status}
                  onChange={(e) => setSettingsForm((prev: any) => ({ ...prev, status: e.target.value }))}
                  className="glass-input w-full bg-slate-950"
                >
                  <option value="DRAFT">Draft (Locked to Students)</option>
                  <option value="PUBLISHED">Published (Eligible Students Can Attempt)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={updateExamMutation.isPending}
                  className="glass-btn-primary py-2 px-6"
                >
                  {updateExamMutation.isPending ? 'Saving Settings...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* TOPIC FORM DIALOG */}
      {topicModalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content">
            <h3 className="text-lg font-bold mb-4 capitalize">
              {topicModalType} Topic
            </h3>

            {topicModalType === 'delete' ? (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Are you absolutely sure you want to delete this topic? All questions belonging to this topic will also be permanently deleted.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setTopicModalOpen(false)} className="glass-btn-secondary py-2 px-4">Cancel</button>
                  <button onClick={handleTopicDeleteConfirm} className="glass-btn-danger py-2 px-4">Confirm Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTopicSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Topic Title</label>
                  <input
                    type="text"
                    required
                    value={topicForm.title}
                    onChange={(e) => setTopicForm(prev => ({ ...prev, title: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="e.g. Microprocessors Fundamentals"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
                  <textarea
                    value={topicForm.description}
                    onChange={(e) => setTopicForm(prev => ({ ...prev, description: e.target.value }))}
                    className="glass-input w-full min-h-[90px]"
                    placeholder="Add brief details about this topic syllabus..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setTopicModalOpen(false)} className="glass-btn-secondary py-2 px-4">Cancel</button>
                  <button type="submit" className="glass-btn-primary py-2 px-4">Save Topic</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QUESTION FORM DIALOG */}
      {questionModalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content max-w-2xl">
            <h3 className="text-lg font-bold mb-4">
              {questionModalType === 'delete' ? 'Delete' : questionModalType === 'edit' ? 'Edit' : 'Add'} Fill-in-the-gap Question
            </h3>

            {questionModalType === 'delete' ? (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Are you absolutely sure you want to delete this question? Any subsequent questions depending on this in linear chains may have their links broken.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setQuestionModalOpen(false)} className="glass-btn-secondary py-2 px-4">Cancel</button>
                  <button onClick={handleQuestionDeleteConfirm} className="glass-btn-danger py-2 px-4">Confirm Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuestionSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Topic Area</label>
                    <select
                      required
                      value={questionForm.topicId}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, topicId: e.target.value, previousQuestionId: undefined }))}
                      className="glass-input w-full bg-slate-950"
                    >
                      {exam.topics?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dependency configuration */}
                  <div className="flex items-center space-x-3 mt-6">
                    <input
                      type="checkbox"
                      id="hasDependency"
                      checked={questionForm.hasDependency}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, hasDependency: e.target.checked, previousQuestionId: undefined }))}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <label htmlFor="hasDependency" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Depends on a previous question
                    </label>
                  </div>
                </div>

                {/* Filtered dropdown of previous questions inside the SAME topic */}
                {questionForm.hasDependency && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Dependent On</label>
                    <select
                      required
                      value={questionForm.previousQuestionId || ''}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, previousQuestionId: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-mono text-xs"
                    >
                      <option value="">-- Choose Previous Question --</option>
                      {getOtherQuestionsInTopic(questionForm.topicId, editQuestionItem?.id).map((q: any) => (
                        <option key={q.id} value={q.id}>{q.questionText}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Question Text</label>
                    <button
                      type="button"
                      onClick={handleInsertGap}
                      className="glass-btn-secondary px-2 py-0.5 text-[10px] flex items-center space-x-1 border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 font-bold rounded"
                    >
                      <span>+ Insert Next Gap</span>
                    </button>
                  </div>
                  <textarea
                    required
                    id="question-textarea"
                    value={questionForm.questionText}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, questionText: e.target.value }))}
                    className="glass-input w-full min-h-[100px] font-mono text-xs"
                    placeholder="e.g. The CPU consists of the {{gap:1}} and the {{gap:2}}."
                  />
                </div>

                {/* DYNAMIC GAPS EDITOR */}
                {questionForm.gaps.length > 0 && (
                  <div className="space-y-4 bg-slate-950/60 border border-slate-900 rounded-xl p-4 max-h-72 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Gaps Configuration</h4>
                    
                    {questionForm.gaps.map((gap, index) => {
                      const handleGapScoreChange = (score: number) => {
                        setQuestionForm(prev => {
                          const updated = [...prev.gaps];
                          updated[index] = { ...updated[index], points: score };
                          return { ...prev, gaps: updated };
                        });
                      };

                      const handleGapAnswersChange = (answersText: string) => {
                        const arr = answersText.split(',').map(a => a.trim()).filter(Boolean);
                        setQuestionForm(prev => {
                          const updated = [...prev.gaps];
                          updated[index] = { 
                            ...updated[index], 
                            rawAnswersText: answersText, 
                            acceptedAnswers: arr 
                          };
                          return { ...prev, gaps: updated };
                        });
                      };

                      return (
                        <div key={gap.position} className="grid grid-cols-12 gap-4 items-center bg-slate-900/40 p-3 rounded-lg border border-slate-800/40">
                          <div className="col-span-2 text-center">
                            <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg block">
                              Gap {gap.position}
                            </span>
                          </div>
                          
                          <div className="col-span-3 space-y-1 text-left">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Points</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              required
                              value={gap.points}
                              onChange={(e) => handleGapScoreChange(parseFloat(e.target.value) || 1.0)}
                              className="glass-input w-full py-1.5 px-3 text-xs"
                            />
                          </div>

                          <div className="col-span-7 space-y-1 text-left">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Accepted Answers (Comma separated)</label>
                            <input
                              type="text"
                              required
                              value={gap.rawAnswersText || ''}
                              onChange={(e) => handleGapAnswersChange(e.target.value)}
                              className="glass-input w-full py-1.5 px-3 text-xs"
                              placeholder="e.g. ALU, Arithmetic Logic Unit"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setQuestionModalOpen(false)} className="glass-btn-secondary py-2 px-4">Cancel</button>
                  <button type="submit" className="glass-btn-primary py-2 px-4">Save Question</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDetails;
