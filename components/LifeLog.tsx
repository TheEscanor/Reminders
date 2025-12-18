import React, { useMemo } from 'react';
import { ReminderItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { History, TrendingUp, Calendar, BookOpen } from 'lucide-react';

interface LifeLogProps {
  items: ReminderItem[];
}

const LifeLog: React.FC<LifeLogProps> = ({ items }) => {
  const historyItems = useMemo(() => {
    return items
      .filter(item => item.isCompleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    months.forEach(m => data[m] = 0);
    historyItems.forEach(item => {
      const date = new Date(item.updatedAt);
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];
      data[monthName] = (data[monthName] || 0) + 1;
    });
    return Object.keys(data).map(key => ({ name: key, count: data[key] }));
  }, [historyItems]);

  const groupedByYear = useMemo(() => {
    const groups: Record<string, ReminderItem[]> = {};
    historyItems.forEach(item => {
      const year = new Date(item.updatedAt).getFullYear() + 543; // Thai Year
      if (!groups[year]) groups[year] = [];
      groups[year].push(item);
    });
    return groups;
  }, [historyItems]);

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="glass-panel bg-black/40 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10 backdrop-blur-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <History size={160} />
        </div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-glow">
                <BookOpen className="text-white" size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-wide">Life Log Timeline</h2>
          </div>
          <p className="text-white/60 max-w-xl text-sm leading-relaxed mb-8 font-medium">
            บันทึกการเดินทางของชีวิตและเหตุการณ์สำคัญในรูปแบบ Timeline ที่สวยงาม
          </p>
          
          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-w-[140px]">
              <div className="text-white/40 text-[10px] font-bold mb-1 uppercase tracking-widest">บันทึกทั้งหมด</div>
              <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">{historyItems.length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-w-[140px]">
              <div className="text-white/40 text-[10px] font-bold mb-1 uppercase tracking-widest">ปีปัจจุบัน</div>
              <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                {groupedByYear[new Date().getFullYear() + 543]?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="glass-panel rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-white/10">
        <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
                <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <h3 className="font-bold text-zinc-800 dark:text-white">Activity Graph</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: 'rgba(255,255,255,0.5)'}} 
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: 'rgba(255,255,255,0.5)'}} 
              />
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Tooltip 
                contentStyle={{
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    backgroundColor: 'rgba(20, 20, 30, 0.8)',
                    backdropFilter: 'blur(10px)',
                    color: 'white'
                }} 
                cursor={{stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '5 5'}}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#818cf8" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                strokeWidth={3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-10 pb-10">
        {years.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 dark:text-white/30">
            <History size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">ยังไม่มีข้อมูลในบันทึก</p>
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="relative">
              <div className="sticky top-0 z-10 backdrop-blur-md py-4 flex items-center gap-4 mb-6 rounded-2xl px-2">
                 <div className="bg-white text-black dark:bg-indigo-600 dark:text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20">
                    ปี {year}
                 </div>
                 <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <div className="space-y-6 pl-4 md:pl-8 border-l-2 border-white/10 ml-4 md:ml-6 pb-4">
                {groupedByYear[year].map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[25px] md:-left-[41px] top-6 w-4 h-4 rounded-full border-4 border-zinc-900 dark:border-black bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-transform group-hover:scale-125"></div>
                    
                    <div className="glass-panel bg-white/5 dark:bg-black/30 p-6 rounded-[2rem] shadow-lg border border-white/5 hover:bg-white/10 transition-all duration-300 group-hover:translate-x-1">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white/80 uppercase tracking-wide border border-white/5">
                                {item.category}
                             </span>
                             <span className="text-xs text-white/40 font-medium flex items-center gap-1.5">
                                <Calendar size={12} />
                                {new Date(item.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                             </span>
                          </div>
                          <h4 className="text-xl font-bold text-zinc-800 dark:text-white drop-shadow-sm">{item.title}</h4>
                        </div>
                        {item.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {item.tags.map((tag, idx) => (
                              <span key={idx} className="text-[10px] px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full font-medium border border-indigo-500/20">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Data Snapshots */}
                      {item.fields.length > 0 && (
                        <div className="mt-4 bg-black/20 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/5">
                           {item.fields.map(field => (
                             <div key={field.id} className="flex flex-col">
                                <span className="text-xs text-white/40 font-medium mb-0.5">{field.label}</span>
                                <span className="text-sm font-bold text-white/90">
                                    {field.type === 'checkbox' ? (field.value ? 'ใช่' : 'ไม่ใช่') : field.value}
                                </span>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LifeLog;