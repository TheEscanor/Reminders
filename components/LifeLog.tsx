import React, { useMemo } from 'react';
import { ReminderItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { History, TrendingUp, BookOpen } from 'lucide-react';
import { translations, Lang } from '../i18n';

interface LifeLogProps {
  items: ReminderItem[];
  lang: Lang;
}

const LifeLog: React.FC<LifeLogProps> = ({ items, lang }) => {
  const t = translations[lang];
  const historyItems = useMemo(() => items.filter(item => item.isCompleted).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [items]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const months = lang === 'th' ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(m => data[m] = 0);
    historyItems.forEach(item => { const date = new Date(item.updatedAt); data[months[date.getMonth()]]++; });
    return Object.keys(data).map(key => ({ name: key, count: data[key] }));
  }, [historyItems, lang]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel bg-black/40 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10"><History size={160} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3"><div className="bg-indigo-600 p-2 rounded-xl"><BookOpen className="text-white" size={20} /></div><h2 className="text-2xl font-bold">{t.lifeLogTitle}</h2></div>
          <p className="text-white/60 max-w-xl text-sm mb-8">{t.lifeLogSub}</p>
          <div className="flex gap-6">
            <div className="bg-white/5 p-4 rounded-2xl min-w-[140px] border border-white/10"><div className="text-white/40 text-[10px] font-bold mb-1 uppercase">{t.totalLogs}</div><div className="text-4xl font-bold">{historyItems.length}</div></div>
            <div className="bg-white/5 p-4 rounded-2xl min-w-[140px] border border-white/10"><div className="text-white/40 text-[10px] font-bold mb-1 uppercase">{t.currentYear}</div><div className="text-4xl font-bold text-indigo-400">{historyItems.filter(i => new Date(i.updatedAt).getFullYear() === new Date().getFullYear()).length}</div></div>
          </div>
        </div>
      </div>
      <div className="glass-panel rounded-[2.5rem] p-8 shadow-xl border border-white/10">
        <div className="flex items-center gap-2 mb-6"><div className="bg-emerald-500/20 p-2 rounded-xl"><TrendingUp className="text-emerald-400" size={20} /></div><h3 className="font-bold">{t.activityGraph}</h3></div>
        <div className="h-64 w-full">
          <ResponsiveContainer><AreaChart data={chartData}><defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 10}} /><YAxis tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 10}} /><Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '10px' }} /><Area type="monotone" dataKey="count" stroke="#818cf8" fill="url(#colorCount)" strokeWidth={3} /></AreaChart></ResponsiveContainer>
        </div>
      </div>
      {historyItems.length === 0 && <div className="text-center py-20 text-zinc-500">{t.noLogs}</div>}
      <div className="space-y-6">
        {historyItems.map(item => (
          <div key={item.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:bg-white/5 transition flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold px-2 py-1 bg-white/10 rounded-full">{item.category}</span><span className="text-xs opacity-40">{new Date(item.updatedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}</span></div>
                <h4 className="text-lg font-bold">{item.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LifeLog;