import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  BookOpen, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Layers, 
  ClipboardList,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation links based on user role
  const getNavLinks = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: 'Overview & CRUD', path: '/admin/dashboard', icon: Layers },
        ];
      case 'LECTURER':
        return [
          { name: 'My Courses', path: '/lecturer/dashboard', icon: BookOpen },
        ];
      case 'STUDENT':
        return [
          { name: 'Eligible Exams', path: '/student/dashboard', icon: ClipboardList },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-7 w-7 text-indigo-500" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">GAP Exam Portal</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-slate-200 focus:outline-none"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/60 border-r border-slate-800/80 backdrop-blur-md p-6 flex flex-col justify-between transition-transform duration-300 transform
        md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="hidden md:flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-indigo-500" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">GAP Exam</span>
          </div>

          {/* User Profile Summary */}
          <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user.firstName} {user.lastName}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                {user.role === 'ADMIN' && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                {user.role === 'LECTURER' && <Briefcase className="h-3 w-3 text-amber-400" />}
                {user.role === 'STUDENT' && <GraduationCap className="h-3 w-3 text-sky-400" />}
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
