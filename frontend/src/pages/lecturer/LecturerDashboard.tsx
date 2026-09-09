import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Search, HelpCircle } from 'lucide-react';

const LecturerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data;
    }
  });

  // Fetch exams to count exams per course
  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data;
    }
  });

  const getExamsCount = (courseId: string) => {
    return exams.filter((exam: any) => exam.courseId === courseId).length;
  };

  const filteredCourses = courses.filter((course: any) => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Lecturer Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Manage course exams, topics, questions and results sheet exports.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search courses by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-input w-full pl-11"
        />
      </div>

      {/* Courses Grid */}
      {loadingCourses || loadingExams ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/4"></div>
              <div className="h-6 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4">
          <HelpCircle className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-300">No Assigned Courses Found</h3>
            <p className="text-slate-500 text-sm mt-1">You have not been assigned to any courses yet. Please contact your administrator to assign courses to you.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: any) => {
            const isMyDept = course.departmentId === user?.departmentId;
            const examCount = getExamsCount(course.id);
            return (
              <Link 
                key={course.id} 
                to={`/lecturer/courses/${course.id}`}
                className="glass-card p-6 flex flex-col justify-between min-h-[160px] text-left group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    {isMyDept && (
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        My Dept
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors text-lg leading-snug">
                    {course.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4 mt-4">
                  <span className="truncate max-w-[150px]">{course.department?.name}</span>
                  <div className="flex items-center space-x-1 font-medium text-indigo-300">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{examCount} {examCount === 1 ? 'Exam' : 'Exams'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LecturerDashboard;
