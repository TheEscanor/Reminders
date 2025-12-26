import React, { useMemo } from 'react';
import { ReminderItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, Calendar, CheckCircle2, Clock, Loader2, Sparkles, TrendingUp, Zap, Flag, List } from 'lucide-react';
import { translations, Lang } from '../i18n';

interface DashboardProps {
  items: ReminderItem[];
  aiSummary: string | null;
  loadingSummary: boolean;
  onRefreshSummary: () => void;
  lang: Lang;
}

const Dashboard: React.FC<DashboardProps> = ({ items, aiSummary, loadingSummary, onRefreshSummary, lang }) => {
  const t = translations[lang];
  
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter(i => i.isCompleted).length;
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdue = items.filter(i => !i.isCompleted && i.dueDate && new Date(i.dueDate) < today).length;
    const upcoming = items.filter(i => {
      if (!i.dueDate || i.isCompleted) return false;
      const due = new Date(i.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return due >= today && diffDays <= 7;
    }).length;
    return { total, completed, overdue, upcoming };
  }, [items]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    items.forEach(item => { categories[item.category] = (categories[item.category] || 0) + 1; });
    return Object.keys(categories).map(key => ({ name: key, count: categories[key] }));
  }, [items]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#f43f5e'];

  const ControlWidget = ({ title, value, subValue, icon: Icon, colorClass, bgGradient, delay }: any) => (
    <div className={`glass-panel rounded-[2rem] p-5 relative overflow-hidden group hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] cursor-pointer shadow-lg backdrop-blur-xl animate-fade-in`} style={{ animationDelay: `${delay}ms` }}>
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${bgGradient} transition-opacity group-hover:opacity-30`}></div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass} bg-white/10 backdrop-blur-md shadow-inner mb-2`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="text-3xl font-bold text-white mb-0.5 tracking-tight drop-shadow-sm">{value}</h3>
                <p className="text-white/60 text-sm font-medium flex justify-between items-center">
                    {title}
                    {subValue && <span className="text-xs opacity-70 bg-white/10 px-2 py-0.5 rounded-full">{subValue}</span>}
                </p>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <ControlWidget title={t.completed} value={stats.completed} subValue={`${Math.round((stats.completed/stats.total || 0)*100)}%`} icon={CheckCircle2} colorClass="text-emerald-400" bgGradient="from-emerald-500 to-green-600" delay={0} />
        <ControlWidget title={t.overdue} value={stats.overdue} icon={AlertCircle} colorClass="text-red-400" bgGradient="from-red-500 to-rose-600" delay={100} />
        <ControlWidget title={t.upcoming} value={stats.upcoming} icon={Clock} colorClass="text-amber-400" bgGradient="from-amber-500 to-orange-600" delay={200} />
        <ControlWidget title={t.totalItems} value={stats.total} icon={List} colorClass="text-blue-400" bgGradient="from-blue-500 to-indigo-600" delay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl animate-fade-in" style={{animationDelay: '400ms'}}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-glow"><Sparkles className="text-white" size={24} /></div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-800 dark:text-white">{t.aiWeeklyInsight}</h3>
                            <p className="text-sm text-zinc-500 dark:text-white/60">{t.aiPowered}</p>
                        </div>
                    </div>
                    <button onClick={onRefreshSummary} className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-indigo-600 dark:text-white px-5 py-2.5 rounded-full shadow-sm transition-all border border-white/10 backdrop-blur-md">
                        {loadingSummary ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
                        {loadingSummary ? '...' : t.refresh}
                    </button>
                </div>
                <div className="bg-black/10 dark:bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/5 text-zinc-700 dark:text-white/90 text-base leading-relaxed whitespace-pre-line shadow-inner min-h-[120px]">
                   {aiSummary || (lang === 'th' ? "กดปุ่ม 'รีเฟรชข้อมูล' เพื่อให้ AI ช่วยสรุป..." : "Press 'Refresh' to get AI summary...")}
                </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-6 flex flex-col shadow-xl animate-fade-in" style={{animationDelay: '500ms'}}>
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500/20 p-2 rounded-xl"><TrendingUp className="text-blue-500 dark:text-blue-300" size={20} /></div>
                <h3 className="font-bold text-zinc-800 dark:text-white">{t.categories}</h3>
            </div>
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)' }} interval={0} />
                  <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)', color: 'white', padding: '12px' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={24}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;