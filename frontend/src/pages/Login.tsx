import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, Copy, Check } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Read redirect target from routing state
  const from = location.state?.from?.pathname || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await login(identifier, password);
      
      // Determine redirection target based on role
      if (from) {
        navigate(from, { replace: true });
      } else {
        const dest = {
          ADMIN: '/admin/dashboard',
          LECTURER: '/lecturer/dashboard',
          STUDENT: '/student/dashboard',
        }[profile.role];
        navigate(dest || '/login', { replace: true });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Invalid identifier or password. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
        {/* Left Side: System Info & Credentials helper */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/15 rounded-2xl border border-indigo-500/30 text-indigo-400">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">CPE 508 Project</span>
              <h1 className="text-2xl font-black bg-gradient-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent">GAP Examination System</h1>
            </div>
          </div>
          
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            A premium, secure university portal for fill-in-the-gap examinations featuring linear chain dependencies, real-time autosaves, and automated grading modes.
          </p>

          {/* Seeded credentials helper panel */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Seeded Test Credentials</h2>
            
            <div className="space-y-3">
              {/* Admin */}
              <div className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded border border-slate-800/60">
                <div>
                  <p className="font-bold text-slate-400">System Admin</p>
                  <p className="font-mono text-slate-300 mt-0.5">admin@gap.edu / adminpassword123</p>
                </div>
                <button 
                  onClick={() => copyToClipboard('admin@gap.edu', 'admin')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedText === 'admin' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Lecturer */}
              <div className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded border border-slate-800/60">
                <div>
                  <p className="font-bold text-slate-400">Lecturer (Dr. John Doe)</p>
                  <p className="font-mono text-slate-300 mt-0.5">lecturer1@gap.edu / password123</p>
                </div>
                <button 
                  onClick={() => copyToClipboard('lecturer1@gap.edu', 'lecturer')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedText === 'lecturer' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Students */}
              <div className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded border border-slate-800/60">
                <div>
                  <p className="font-bold text-slate-400">Student (Alice Smith)</p>
                  <p className="font-mono text-slate-300 mt-0.5">CPE/2021/001 / smith</p>
                </div>
                <button 
                  onClick={() => copyToClipboard('CPE/2021/001', 'student1')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedText === 'student1' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-8 relative overflow-hidden">
            <h2 className="text-xl font-bold mb-1">Welcome back</h2>
            <p className="text-slate-400 text-xs mb-6">Enter your credentials to access your exam dashboard.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-2.5 text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Identifier Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-400">Email or Registration Number</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@gap.edu or CPE/2021/001"
                    className="glass-input w-full pl-11"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full pl-11"
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="glass-btn-primary w-full py-3 flex items-center justify-center space-x-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-100/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Access Account</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
