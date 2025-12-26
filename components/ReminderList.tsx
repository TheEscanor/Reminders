import React, { useState, useMemo } from 'react';
import { ReminderItem } from '../types';
import { Calendar, Tag, Trash2, Edit2, CheckCircle2, Circle, Search, Filter, AlertCircle, Clock, Flame, Copy, ChevronRight, CalendarClock, Eye, X, Layers, FileText, Hash, Flag, Repeat, Landmark, Hourglass } from 'lucide-react';

interface ReminderListProps {
  items: ReminderItem[];
  onEdit: (item: ReminderItem) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, current: boolean) => void;
  onDuplicate: (item: ReminderItem) => void;
  onSnooze: (id: string, type: 'tomorrow' | 'nextWeek') => void;
}

const ReminderList: React.FC<ReminderListProps> = ({ items, onEdit, onDelete, onToggleComplete, onDuplicate, onSnooze }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<ReminderItem | null>(null);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        const matchesStatus = filterStatus === 'All' 
            ? true 
            : filterStatus === 'Completed' ? item.isCompleted : !item.isCompleted;

        return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, filterCategory, filterStatus]);

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const groupedItems = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const groups = {
        overdue: [] as ReminderItem[],
        today: [] as ReminderItem[],
        tomorrow: [] as ReminderItem[],
        thisWeek: [] as ReminderItem[],
        later: [] as ReminderItem[],
        noDate: [] as ReminderItem[],
        completed: [] as ReminderItem[]
      };

      filteredItems.forEach(item => {
        if (item.isCompleted) { groups.completed.push(item); return; }
        if (!item.dueDate) { groups.noDate.push(item); return; }
        const due = normalizeDate(item.dueDate);
        if (!due) return;
        if (due < today) groups.overdue.push(item);
        else if (due.getTime() === today.getTime()) groups.today.push(item);
        else if (due.getTime() === tomorrow.getTime()) groups.tomorrow.push(item);
        else if (due <= nextWeek) groups.thisWeek.push(item);
        else groups.later.push(item);
      });

      const sortFn = (a: ReminderItem, b: ReminderItem) => {
          const prioScore = { high: 3, medium: 2, low: 1 };
          const scoreA = prioScore[a.priority || 'low'];
          const scoreB = prioScore[b.priority || 'low'];
          if (scoreA !== scoreB) return scoreB - scoreA;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return 0;
      };

      Object.values(groups).forEach(g => g.sort(sortFn));
      return groups;
  }, [filteredItems]);

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = normalizeDate(dateStr);
    return due ? Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  }

  const getDaysRemainingInfo = (dateStr: string | null, isCompleted: boolean) => {
    if (!dateStr || isCompleted) return null;
    const diff = getDaysDiff(dateStr);
    if (diff === null) return null;
    if (diff < 0) return { text: `(Overdue ${Math.abs(diff)} d)`, color: 'text-red-500 font-bold' };
    if (diff === 0) return { text: '(Today)', color: 'text-red-600 font-bold' };
    if (diff === 1) return { text: '(Tomorrow)', color: 'text-orange-500 font-bold' };
    if (diff <= 7) return { text: `(In ${diff} d)`, color: 'text-indigo-600 dark:text-indigo-400 font-medium' };
    return { text: `(${diff} d left)`, color: 'text-zinc-400' };
  };

  const GroupHeader = ({ title, count, colorClass, icon: Icon }: any) => (
      <div className={`flex items-center gap-2 mb-4 mt-8 pb-2 border-b border-zinc-200 dark:border-white/5 ${colorClass}`}>
          <Icon size={18} strokeWidth={2.5} />
          <h4 className="text-xs font-black uppercase tracking-widest">{title}</h4>
          <span className="text-[10px] bg-zinc-200 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">{count}</span>
      </div>
  );

  const renderItem = (item: ReminderItem) => {
      const daysDiff = getDaysDiff(item.dueDate);
      const isUrgent = !item.isCompleted && (item.priority === 'high' || (daysDiff !== null && daysDiff < 0));
      const daysInfo = getDaysRemainingInfo(item.dueDate, item.isCompleted);
      
      let containerClass = "glass-panel group relative transition-all duration-300 p-5 rounded-[1.5rem] mb-4 hover:shadow-xl hover:-translate-y-1";
      
      if (item.isCompleted) {
          containerClass += " opacity-60 grayscale bg-zinc-100 dark:bg-black/30 border-transparent";
      } else if (isUrgent) {
          containerClass += " ring-2 ring-red-500/20 border-red-500/30";
      }

      return (
        <li key={item.id} className={containerClass}>
            <div className="flex items-start gap-4">
                <button 
                  onClick={() => onToggleComplete(item.id, item.isCompleted)}
                  className={`mt-1 transition-transform active:scale-75 ${item.isCompleted ? 'text-emerald-500' : isUrgent ? 'text-red-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-indigo-500'}`}
                >
                  {item.isCompleted ? <CheckCircle2 size={24} fill="currentColor" className="text-white dark:text-emerald-950" /> : <Circle size={24} strokeWidth={2.5} />}
                </button>
                
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingItem(item)}>
                  <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold text-lg truncate ${item.isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                        {item.title}
                      </h3>
                      {daysInfo && <span className={`text-[10px] ${daysInfo.color} uppercase tracking-tighter`}>{daysInfo.text}</span>}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                      {item.dueDate && (
                        <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-red-500 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          <Calendar size={12} />
                          {new Date(item.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md font-bold text-[10px] uppercase tracking-wider">
                        {item.category}
                      </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg transition"><Edit2 size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-lg transition"><Trash2 size={16}/></button>
                </div>
            </div>
        </li>
      );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 glass-panel p-3 rounded-[2rem] sticky top-0 z-20">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search reminders..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 dark:bg-black/20 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>
        <div className="flex gap-2">
           <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2.5 bg-zinc-50 dark:bg-black/20 rounded-2xl text-xs font-bold border-none outline-none">
             {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'Categories' : c}</option>)}
           </select>
           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-4 py-2.5 bg-zinc-50 dark:bg-black/20 rounded-2xl text-xs font-bold border-none outline-none">
             <option value="All">All Status</option>
             <option value="Pending">Pending</option>
             <option value="Completed">Completed</option>
           </select>
        </div>
      </div>

      <div className="pb-20">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">No items found matching your criteria</div>
          ) : (
            <>
              {groupedItems.overdue.length > 0 && (
                  <div><GroupHeader title="Overdue" count={groupedItems.overdue.length} colorClass="text-red-500" icon={AlertCircle} />
                  <ul>{groupedItems.overdue.map(renderItem)}</ul></div>
              )}
              {groupedItems.today.length > 0 && (
                  <div><GroupHeader title="Today" count={groupedItems.today.length} colorClass="text-indigo-600 dark:text-indigo-400" icon={Clock} />
                  <ul>{groupedItems.today.map(renderItem)}</ul></div>
              )}
              {groupedItems.tomorrow.length > 0 && (
                  <div><GroupHeader title="Tomorrow" count={groupedItems.tomorrow.length} colorClass="text-orange-500" icon={Clock} />
                  <ul>{groupedItems.tomorrow.map(renderItem)}</ul></div>
              )}
              {groupedItems.thisWeek.length > 0 && (
                  <div><GroupHeader title="This Week" count={groupedItems.thisWeek.length} colorClass="text-zinc-500" icon={Calendar} />
                  <ul>{groupedItems.thisWeek.map(renderItem)}</ul></div>
              )}
              {groupedItems.later.length > 0 && (
                  <div><GroupHeader title="Upcoming" count={groupedItems.later.length} colorClass="text-zinc-400" icon={ChevronRight} />
                  <ul>{groupedItems.later.map(renderItem)}</ul></div>
              )}
              {groupedItems.noDate.length > 0 && (
                  <div><GroupHeader title="Other" count={groupedItems.noDate.length} colorClass="text-zinc-400" icon={Tag} />
                  <ul>{groupedItems.noDate.map(renderItem)}</ul></div>
              )}
              {groupedItems.completed.length > 0 && filterStatus !== 'Pending' && (
                  <div className="mt-10 opacity-60 grayscale">
                    <GroupHeader title="Completed" count={groupedItems.completed.length} colorClass="text-zinc-400" icon={CheckCircle2} />
                    <ul>{groupedItems.completed.map(renderItem)}</ul>
                  </div>
              )}
            </>
          )}
      </div>

      {/* Basic View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setViewingItem(null)}>
           <div className="glass-panel rounded-[2.5rem] w-full max-w-lg p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">{viewingItem.title}</h2>
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{viewingItem.category}</span>
                 </div>
                 <button onClick={() => setViewingItem(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-white/5">
                    <span className="text-sm font-bold text-zinc-400">Due Date</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{viewingItem.dueDate || 'No Date'}</span>
                 </div>
                 {viewingItem.fields.map(f => (
                    <div key={f.id} className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-white/5">
                       <span className="text-sm font-bold text-zinc-400">{f.label}</span>
                       <span className="text-sm font-bold text-zinc-900 dark:text-white">{f.type === 'checkbox' ? (f.value ? 'Yes' : 'No') : f.value}</span>
                    </div>
                 ))}
              </div>
              <button onClick={() => {onEdit(viewingItem); setViewingItem(null);}} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20">Edit Item</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReminderList;