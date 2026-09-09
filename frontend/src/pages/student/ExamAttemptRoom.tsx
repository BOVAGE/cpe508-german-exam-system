import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { Clock, AlertTriangle, CheckCircle2, RefreshCw, Send } from 'lucide-react';

const ExamAttemptRoom: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
  const [saveStates, setSaveStates] = useState<Record<string, 'clean' | 'unsaved' | 'saving' | 'saved'>>({});
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerIntervalRef = useRef<any | null>(null);

  // Debounce saving timers map (maps "questionId-position" to timeout IDs)
  const debounceTimersRef = useRef<Record<string, any>>({});

  // Modals state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);

  // Fetch exam info
  const { data: exam } = useQuery({
    queryKey: ['exams', examId],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}`);
      return res.data;
    }
  });

  // Fetch attempt state (or resume active attempt)
  const { data: attempt, isLoading: loadingAttempt } = useQuery({
    queryKey: ['attempts', examId, 'state'],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}/attempts/state`);
      return res.data;
    },
    refetchOnWindowFocus: false // Don't trigger refetches on focus inside exam room
  });

  // Hydrate answers from backend attempt state
  useEffect(() => {
    if (attempt && attempt.questions) {
      const initialAnswers: Record<string, Record<number, string>> = {};
      const initialStates: Record<string, 'clean' | 'unsaved' | 'saving' | 'saved'> = {};

      attempt.questions.forEach((aq: any) => {
        initialAnswers[aq.question.id] = {};
        initialStates[aq.question.id] = 'clean';

        if (aq.gapAnswers && aq.gapAnswers.length > 0) {
          aq.gapAnswers.forEach((ans: any) => {
            const gap = aq.question.gaps.find((g: any) => g.id === ans.questionGapId);
            if (gap) {
              initialAnswers[aq.question.id][gap.position] = ans.answer;
              initialStates[aq.question.id] = 'saved';
            }
          });
        }
      });

      setAnswers(initialAnswers);
      setSaveStates(initialStates);
    }
  }, [attempt]);

  // Real-time Countdown Timer logic
  useEffect(() => {
    if (attempt && exam && attempt.status === 'IN_PROGRESS' && !isTimeUp) {
      const startedTime = new Date(attempt.startedAt).getTime();
      const durationMs = exam.duration * 60 * 1000;
      const scheduledEndTime = new Date(exam.scheduledEnd).getTime();
      const deadline = Math.min(startedTime + durationMs, scheduledEndTime);

      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = deadline - now;

        if (diff <= 0) {
          setTimeLeft('00:00');
          setIsTimeUp(true);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleAutoSubmit();
        } else {
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          const mStr = minutes.toString().padStart(2, '0');
          const sStr = seconds.toString().padStart(2, '0');
          setTimeLeft(`${mStr}:${sStr}`);
        }
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [attempt, exam, isTimeUp]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // Save intermediate gap answer mutation
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ qId, pos, val }: { qId: string; pos: number; val: string }) => {
      return api.post(`/exams/${examId}/attempts/answers`, {
        questionId: qId,
        gapPosition: pos,
        answer: val
      });
    },
    onSuccess: (_, variables) => {
      setSaveStates(prev => ({ ...prev, [variables.qId]: 'saved' }));
    },
    onError: (err: any) => {
      console.error('Autosave error:', err);
      // If server says time expired, trigger final submission
      if (err.response?.status === 400 && err.response?.data?.message?.includes('expired')) {
        setIsTimeUp(true);
        handleAutoSubmit();
      }
    }
  });

  // Submit attempt mutation
  const submitExamMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/exams/${examId}/attempts/submit`);
      return res.data;
    },
    onSuccess: (data) => {
      setResultData(data);
      setSubmitModalOpen(false);
      setResultModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['attempts', examId, 'state'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Submission failed.');
    }
  });

  // Handle typing inside inline inputs
  const handleAnswerChange = (qId: string, pos: number, val: string) => {
    // 1. Update local state
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [pos]: val
      }
    }));

    // Mark as unsaved
    setSaveStates(prev => ({ ...prev, [qId]: 'unsaved' }));

    // 2. Setup Debounce timer (500ms)
    const key = `${qId}-${pos}`;
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }

    debounceTimersRef.current[key] = setTimeout(() => {
      setSaveStates(prev => ({ ...prev, [qId]: 'saving' }));
      saveAnswerMutation.mutate({ qId, pos, val });
      delete debounceTimersRef.current[key];
    }, 500);
  };

  // Timer expiration auto submission
  const handleAutoSubmit = () => {
    // Flush any pending debounce saves immediately
    Object.keys(debounceTimersRef.current).forEach(key => {
      clearTimeout(debounceTimersRef.current[key]);
    });
    submitExamMutation.mutate();
  };

  const handleManualSubmit = () => {
    // Flush all timers
    Object.keys(debounceTimersRef.current).forEach(key => {
      clearTimeout(debounceTimersRef.current[key]);
    });
    submitExamMutation.mutate();
  };

  if (loadingAttempt) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Entering active examination room...</p>
      </div>
    );
  }

  if (!attempt || !attempt.questions || attempt.questions.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-slate-500 text-xs text-left">
        Active attempt not initialized correctly. Go back to lobby.
      </div>
    );
  }

  const currentAq = attempt.questions[currentIdx];
  const currentQuestion = currentAq.question;

  // Custom parser replacing {{gap:X}} tokens with interactive inputs
  const renderQuestionText = (text: string, qId: string) => {
    const parts = text.split(/(\{\{gap:\d+\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/\{\{gap:(\d+)\}\}/);
      if (match) {
        const position = parseInt(match[1]);
        return (
          <input 
            key={index}
            type="text"
            className="inline-block border-b border-indigo-400 bg-slate-900 px-3 py-1 font-mono text-center text-indigo-300 w-36 mx-1 focus:outline-none focus:border-indigo-500 focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/10 rounded transition-all"
            value={answers[qId]?.[position] || ''}
            disabled={isTimeUp || submitExamMutation.isPending}
            onChange={(e) => handleAnswerChange(qId, position, e.target.value)}
          />
        );
      }
      return <span key={index} className="text-slate-200">{part}</span>;
    });
  };

  // Compute timer urgency color styling
  const getTimerColorClass = () => {
    if (timeLeft === '00:00') return 'text-slate-500 border-slate-900';
    const [minStr] = timeLeft.split(':');
    const minutes = parseInt(minStr);
    if (minutes < 1) return 'text-red-500 border-red-500/20 bg-red-500/5 animate-pulse';
    if (minutes < 5) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    return 'text-indigo-400 border-slate-800';
  };

  const calculateMaxScore = (attemptObj: any) => {
    if (!attemptObj) return 0;
    if (attemptObj.questions && attemptObj.questions.length > 0) {
      const totalPoints = attemptObj.questions.reduce((sum: number, aq: any) => {
        const gaps = aq.question?.gaps || [];
        return sum + gaps.reduce((s: number, g: any) => s + (g.points || 0), 0);
      }, 0);
      if (totalPoints > 0) return totalPoints;
    }
    if (attemptObj.percentage && attemptObj.percentage > 0) {
      return Math.round(attemptObj.score / (attemptObj.percentage / 100));
    }
    return attemptObj.score;
  };

  return (
    <div className="space-y-6">
      {/* Graded report redirection check */}
      {attempt.status !== 'IN_PROGRESS' && (
        <div className="glass-panel p-6 border-emerald-500/20 bg-emerald-500/5 text-left space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="font-bold">This Exam Attempt Has Been Graded</h2>
          </div>
          <p className="text-xs text-slate-400">Score: {attempt.score} / {calculateMaxScore(attempt)} | Percentage: {attempt.percentage.toFixed(1)}%</p>
          <button onClick={() => navigate('/student/dashboard')} className="glass-btn-primary py-2 px-4 text-xs">
            Return to Dashboard
          </button>
        </div>
      )}

      {attempt.status === 'IN_PROGRESS' && (
        <>
          {/* Header Dashboard Timer Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="text-left">
              <h1 className="text-2xl font-black">{exam?.title}</h1>
              <p className="text-slate-400 text-xs mt-1">Course: {exam?.course?.code} • Mode: {exam?.gradingMode === 'STRICT' ? 'Strict' : 'Non-strict similarity'}</p>
            </div>

            {/* Countdown timer */}
            <div className={`border px-4 py-2.5 rounded-xl flex items-center space-x-3 transition-colors ${getTimerColorClass()}`}>
              <Clock className="h-5 w-5" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Remaining Time</p>
                <p className="text-xl font-mono font-black tracking-tight">{timeLeft}</p>
              </div>
            </div>
          </div>

          {/* DUAL PANE WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Panel: Question navigator grid */}
            <div className="lg:col-span-4 glass-panel p-5 space-y-6 text-left">
              <h3 className="font-bold text-xs text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Questions Grid</h3>
              
              <div className="grid grid-cols-5 gap-3.5">
                {attempt.questions.map((aq: any, idx: number) => {
                  const qId = aq.question.id;
                  const state = saveStates[qId] || 'clean';

                  let colorClass = 'bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700'; // clean / unattempted
                  if (state === 'unsaved') colorClass = 'bg-amber-500/10 border-amber-500/40 text-amber-400';
                  if (state === 'saving') colorClass = 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 animate-pulse';
                  if (state === 'saved') colorClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';

                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={aq.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`
                        h-12 border font-mono font-bold rounded-lg flex items-center justify-center text-sm transition-all duration-150
                        ${colorClass}
                        ${isCurrent ? 'ring-2 ring-indigo-500 scale-[1.05] border-transparent shadow-lg shadow-indigo-500/10' : ''}
                      `}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status guides legend */}
              <div className="pt-4 border-t border-slate-800/60 space-y-2 text-[10px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 bg-slate-900 border border-slate-800 rounded"></span>
                  <span>Unattempted / Empty</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 bg-amber-500/10 border border-amber-500/40 rounded"></span>
                  <span>Changed, pending autosave</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 bg-emerald-500/10 border border-emerald-500/40 rounded"></span>
                  <span>Autosaved successfully to server</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Current Question Display Workspace */}
            <div className="lg:col-span-8 space-y-6">
              <div className="glass-panel p-8 min-h-[300px] flex flex-col justify-between text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
                
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest bg-slate-950 border border-slate-800 px-3 py-1 rounded text-slate-400">
                      Question {currentIdx + 1} of {attempt.questions.length}
                    </span>
                    
                    {/* autosave text indicator */}
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                      {saveStates[currentQuestion.id] === 'saving' && (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                          <span className="text-indigo-400">Saving answer...</span>
                        </>
                      )}
                      {saveStates[currentQuestion.id] === 'saved' && (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Answers saved</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Question gap inputs */}
                  <div className="text-lg md:text-xl font-medium tracking-wide leading-relaxed font-sans mt-4">
                    {renderQuestionText(currentQuestion.questionText, currentQuestion.id)}
                  </div>
                </div>

                {/* Workspace footer actions */}
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-6 mt-8 relative z-10">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(currentIdx - 1)}
                    className="glass-btn-secondary py-2 px-4 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Previous Question
                  </button>

                  {currentIdx === attempt.questions.length - 1 ? (
                    <button
                      onClick={() => setSubmitModalOpen(true)}
                      className="glass-btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 hover:shadow-emerald-600/20 py-2 px-5 flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Examination</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentIdx(currentIdx + 1)}
                      className="glass-btn-primary py-2 px-4"
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {/* CONFIRMATION SUBMISSION DIALOG */}
      {submitModalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content">
            <div className="flex items-center space-x-3 text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Finalize Examination?</h3>
            </div>

            <p className="text-sm text-slate-300 text-left leading-relaxed">
              Are you sure you want to submit and finalize your examination attempt? 
              This will invoke the automated grading engine. You will not be able to re-enter or change your answers.
            </p>

            <div className="flex justify-end gap-3 pt-6">
              <button 
                type="button" 
                onClick={() => setSubmitModalOpen(false)} 
                disabled={submitExamMutation.isPending}
                className="glass-btn-secondary py-2 px-4"
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit}
                disabled={submitExamMutation.isPending}
                className="glass-btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 py-2 px-4"
              >
                {submitExamMutation.isPending ? 'Grading answers...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRADED RESULTS OVERLAY */}
      {resultModalOpen && resultData && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content max-w-md border-emerald-500/20 bg-emerald-500/5 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
            
            <h3 className="text-xl font-bold text-slate-100">Examination Submitted!</h3>
            <p className="text-xs text-slate-400 mt-1">Your attempt has been automatically processed and graded.</p>

            <div className="my-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score Obtained</p>
                <p className="text-lg font-black text-slate-200">{resultData.score} / {calculateMaxScore(resultData)}</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Percentage Rating</p>
                <p className="text-lg font-black text-emerald-400">{resultData.percentage?.toFixed(1)}%</p>
              </div>
            </div>

            <button
              onClick={() => {
                setResultModalOpen(false);
                navigate('/student/dashboard');
              }}
              className="glass-btn-primary w-full py-2.5"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamAttemptRoom;
