import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Calendar, Clock, HelpCircle } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  // Students findAll returns their registered, published exams
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data;
    }
  });

  const getExamTimeStatus = (startStr: string, endStr: string) => {
    const now = new Date().getTime();
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    if (now < start) {
      return { text: 'Upcoming', style: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
    } else if (now > end) {
      return { text: 'Expired', style: 'bg-red-500/10 border-red-500/20 text-red-400' };
    } else {
      return { text: 'Open / Active', style: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="border-b border-slate-800 pb-5 text-left">
        <h1 className="text-3xl font-black tracking-tight">Student Portal</h1>
        <p className="text-slate-400 text-sm mt-1">Review your eligible registered exams and initiate attempt workspaces.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="glass-panel p-6 space-y-4">
              <div className="h-4 bg-slate-800 rounded w-1/4"></div>
              <div className="h-6 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4">
          <HelpCircle className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-md font-bold text-slate-300">No Exams Available</h3>
            <p className="text-slate-500 text-sm mt-1">You are not currently registered as an eligible participant for any active examinations.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam: any) => {
            const timeStatus = getExamTimeStatus(exam.scheduledStart, exam.scheduledEnd);
            return (
              <div 
                key={exam.id}
                className="glass-panel p-6 flex flex-col justify-between min-h-[200px] text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl"></div>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {exam.course?.code || 'CPE Course'}
                    </span>
                    <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded border ${timeStatus.style}`}>
                      {timeStatus.text}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors leading-snug">
                    {exam.title}
                  </h3>
                  
                  {exam.description && (
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-6 relative z-10">
                  <div className="flex space-x-4 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{exam.duration} Minutes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{new Date(exam.scheduledStart).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link 
                    to={`/student/exams/${exam.id}/instructions`}
                    className="glass-btn-primary py-2 px-4 text-xs font-semibold"
                  >
                    View Exam Room
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
