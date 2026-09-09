import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import CourseDetails from './pages/lecturer/CourseDetails';
import ExamDetails from './pages/lecturer/ExamDetails';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamInstructions from './pages/student/ExamInstructions';
import ExamAttemptRoom from './pages/student/ExamAttemptRoom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Protected Lecturer Routes */}
            <Route
              path="/lecturer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['LECTURER']}>
                  <Layout>
                    <LecturerDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lecturer/courses/:courseId"
              element={
                <ProtectedRoute allowedRoles={['LECTURER']}>
                  <Layout>
                    <CourseDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lecturer/exams/:examId"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'LECTURER']}>
                  <Layout>
                    <ExamDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams/:examId"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'LECTURER']}>
                  <Layout>
                    <ExamDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Protected Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <Layout>
                    <StudentDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams/:examId/instructions"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <Layout>
                    <ExamInstructions />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams/:examId/attempt"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  {/* Attempt room gets its own dedicated distraction-free workspace */}
                  <ExamAttemptRoom />
                </ProtectedRoute>
              }
            />

            {/* Fallback Redirection */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
