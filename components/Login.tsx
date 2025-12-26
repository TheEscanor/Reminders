import React, { useState } from 'react';
import { loginUser } from '../services/sheetService';
import { User as UserType } from '../types';
import { Lock, LogIn, Loader2, Sparkles, AlertCircle, User as UserIcon } from 'lucide-react';
import { translations, Lang } from '../i18n';

interface LoginProps {
  onLoginSuccess: (userData: UserType) => void;
  lang: Lang;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, lang }) => {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError(lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all fields'); return; }
    setIsLoading(true); setError('');
    try {
      const userData = await loginUser(username, password);
      if (userData) onLoginSuccess(userData);
      else setError(lang === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password');
    } catch (err) { setError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Connection error'); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="glass-panel rounded-[2.5rem] p-10 shadow-2xl border border-white/20 backdrop-blur-xl bg-white/10 dark:bg-black/40">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 shadow-glow mb-6"><Sparkles size={40} className="text-white" /></div>
            <h1 className="text-3xl font-bold mb-2">{t.welcomeBack}</h1>
            <p className="text-zinc-600 dark:text-white/60 text-sm">{t.loginSub}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative"><UserIcon className="absolute left-4 top-3.5 text-zinc-400" size={20} /><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.username} className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl outline-none" /></div>
              <div className="relative"><Lock className="absolute left-4 top-3.5 text-zinc-400" size={20} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.password} className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl outline-none" /></div>
            </div>
            {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm"><AlertCircle size={16} />{error}</div>}
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-70">{isLoading ? <Loader2 size={20} className="animate-spin" /> : <>{t.login} <LogIn size={20} /></>}</button>
          </form>
          <div className="mt-8 text-center text-[10px] text-zinc-500 dark:text-white/30">{t.apiKeyNote}</div>
        </div>
      </div>
    </div>
  );
};

export default Login;