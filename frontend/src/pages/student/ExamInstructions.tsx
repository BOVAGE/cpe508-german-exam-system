import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, Award, Hourglass } from 'lucide-react';

const ExamInstructions: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch exam settings
  const { data: exam, isLoading: loadingExam } = useQuery({
    queryKey: ['exams', examId],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}`);
      return res.data;
    }
  });

  // Fetch attempt state (will return 404 if no attempt exists)
  const { data: attempt, error: attemptError, isLoading: loadingAttempt } = useQuery({
    queryKey: ['attempts', examId, 'state'],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}/attempts/state`);
      return res.data;
    },
    retry: false // Avoid query retries on 404 since it means "no attempt yet"
  });

  const noAttemptExists = attemptError && (attemptError as any).response?.status === 404;

  // Mutation to start the attempt
  const startExamMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/exams/${examId}/attempts/start`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempts', examId, 'state'] });
      navigate(`/student/exams/${examId}/attempt`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to initialize exam room. Verify scheduled times.');
    }
  });

  if (loadingExam || loadingAttempt) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Accessing examination room credentials...</p>
      </div>
    );
  }

  const handleStartExam = () => {
    if (window.confirm('Are you ready to start this examination? The timer will begin immediately.')) {
      startExamMutation.mutate();
    }
  };

  const getExamWindowValidity = () => {
    if (!exam) return { valid: false, message: 'Invalid exam' };
    const now = new Date().getTime();
    const start = new Date(exam.scheduledStart).getTime();
    const end = new Date(exam.scheduledEnd).getTime();

    if (now < start) {
      return { 
        valid: false, 
        message: `This examination is scheduled to open on ${new Date(exam.scheduledStart).toLocaleString()}.` 
      };
    }
    if (now > end) {
      return { 
        valid: false, 
        message: 'This examination window has closed.' 
      };
    }
    return { valid: true, message: 'The examination is currently open.' };
  };

  const timeValidity = getExamWindowValidity();

  return (
    <div className="space-y-6 text-left">
      <Link to="/student/dashboard" className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Portal Dashboard</span>
      </Link>

      {exam && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Info Board */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel p-6 md:p-8 space-y-4">
              <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
                {exam.course?.code || 'Course Config'}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-100">{exam.title}</h1>
              <p className="text-slate-400 text-sm leading-relaxed">{exam.description || 'No specific description added.'}</p>
            </div>

            {/* If attempt is completed: Display Graded Report */}
            {attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') ? (
              <div className="glass-panel p-6 md:p-8 border-emerald-500/20 bg-emerald-500/5 space-y-6">
                <div className="flex items-center space-x-3 text-emerald-400">
                  <CheckCircle className="h-7 w-7" />
                  <h2 className="text-xl font-bold">Graded Examination Report</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Final Status</p>
                    <p className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest">{attempt.status.replace('_', ' ')}</p>
                  </div>
                  
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Final Score</p>
                    <p className="text-lg font-black text-slate-200">{attempt.score} / {attempt.questions?.reduce((sum: number, aq: any) => sum + aq.question.gaps.reduce((s: number, g: any) => s + g.points, 0), 0) || attempt.score}</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Percentage Rating</p>
                    <p className="text-lg font-black text-emerald-400">{attempt.percentage.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p>• Your final score has been locked and submitted to the course lecturer.</p>
                  <p>• Submitted at: {new Date(attempt.submittedAt).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              /* If attempt not completed: Show General Guidelines */
              <div className="glass-panel p-6 space-y-4">
                <h2 className="text-md font-bold text-slate-200">Examination Instructions</h2>
                <ul className="space-y-3.5 text-xs text-slate-400 leading-relaxed list-disc pl-4">
                  <li>
                    <strong>Timing Duration:</strong> You have a strict limit of <span className="text-indigo-400 font-bold">{exam.duration} minutes</span> to complete this attempt. The countdown timer on top of the attempt page will indicate time left.
                  </li>
                  <li>
                    <strong>Autosave Integration:</strong> Your intermediate gap inputs are automatically saved to the university server every time you stop typing. If you lose network connection or refresh the page, your answers are preserved and you can resume right away.
                  </li>
                  <li>
                    <strong>Auto-Finalization:</strong> When the countdown timer hits 00:00, further inputs are immediately locked and your attempt is automatically posted to the grading system.
                  </li>
                  <li>
                    <strong>One Attempt Lock:</strong> You are permitted exactly one attempt. Once submitted, you cannot re-enter the workspace.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Actions Card */}
          <div className="lg:col-span-4 glass-panel p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Status Box</h3>

            <div className="space-y-4">
              {/* Duration count */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-3">
                <span className="text-slate-400">Time Limit</span>
                <div className="flex items-center space-x-1.5 font-bold text-slate-200 font-mono">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>{exam.duration} Minutes</span>
                </div>
              </div>

              {/* Mode type */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-3">
                <span className="text-slate-400">Grading System</span>
                <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                  <Award className="h-4 w-4 text-indigo-400" />
                  <span>{exam.gradingMode === 'STRICT' ? 'Strict Matching' : 'Edit Distance (Fuzzy)'}</span>
                </div>
              </div>

              {/* Action buttons based on attempt state */}
              {attempt && attempt.status === 'IN_PROGRESS' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400 flex items-start space-x-2">
                    <Hourglass className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>You have an in-progress attempt. Click resume to return.</span>
                  </div>
                  <Link 
                    to={`/student/exams/${examId}/attempt`}
                    className="glass-btn-primary w-full text-center py-2.5 block"
                  >
                    Resume Exam Attempt
                  </Link>
                </div>
              ) : noAttemptExists ? (
                timeValidity.valid ? (
                  <button 
                    onClick={handleStartExam}
                    disabled={startExamMutation.isPending}
                    className="glass-btn-primary w-full py-2.5"
                  >
                    {startExamMutation.isPending ? 'Launching Attempt...' : 'Start Examination'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{timeValidity.message}</span>
                    </div>
                    <button 
                      disabled
                      className="glass-btn-primary w-full py-2.5 opacity-40 cursor-not-allowed"
                    >
                      Exam Window Locked
                    </button>
                  </div>
                )
              ) : attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') ? (
                <button 
                  disabled
                  className="glass-btn-secondary w-full py-2.5 text-center text-slate-500 border-slate-900 cursor-not-allowed"
                >
                  Exam Already Graded
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInstructions;
