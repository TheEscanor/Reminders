import React, { useState } from 'react';
import { loginUser } from '../services/sheetService';
import { User, Lock, LogIn, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await loginUser(username, password);
      if (success) {
        onLoginSuccess(username);
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 backdrop-blur-xl bg-white/10 dark:bg-black/40">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-glow mb-6 transform rotate-3">
              <Sparkles size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-zinc-600 dark:text-white/60 text-sm">Sign in to AI Smart Reminders</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-zinc-500 dark:text-white/40 group-focus-within:text-indigo-500 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-zinc-500 dark:text-white/40 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-pulse">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Sign In <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500 dark:text-white/30">
              Access restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;