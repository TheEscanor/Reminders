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
  
  // State for viewing details modal
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

  // Helper to normalize date string to midnight date object for accurate comparison
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  // Smart Grouping Logic
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
        if (item.isCompleted) {
            groups.completed.push(item);
            return;
        }
        if (!item.dueDate) {
            groups.noDate.push(item);
            return;
        }

        const due = normalizeDate(item.dueDate);
        if (!due) return;

        if (due < today) groups.overdue.push(item);
        else if (due.getTime() === today.getTime()) groups.today.push(item);
        else if (due.getTime() === tomorrow.getTime()) groups.tomorrow.push(item);
        else if (due <= nextWeek) groups.thisWeek.push(item);
        else groups.later.push(item);
      });

      // Sort by Priority (High > Medium > Low) then Date
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
    if (!due) return null;
    
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Generate text display for remaining days (New Feature)
  const getDaysRemainingInfo = (dateStr: string | null, isCompleted: boolean) => {
    if (!dateStr || isCompleted) return null;
    const diff = getDaysDiff(dateStr);
    if (diff === null) return null;

    if (diff < 0) return { text: `(เลย ${Math.abs(diff)} วัน)`, color: 'text-red-500 dark:text-red-400 font-bold' };
    if (diff === 0) return { text: '(วันนี้)', color: 'text-red-600 dark:text-red-500 font-bold animate-pulse' };
    if (diff === 1) return { text: '(พรุ่งนี้)', color: 'text-orange-500 dark:text-orange-400 font-medium' };
    if (diff <= 7) return { text: `(อีก ${diff} วัน)`, color: 'text-orange-500 dark:text-orange-300 font-medium' };
    return { text: `(อีก ${diff} วัน)`, color: 'text-zinc-400 dark:text-zinc-500' };
  };

  const getRecurrenceLabel = (rec: string | undefined) => {
    if (!rec || rec === 'none') return 'ไม่ทำซ้ำ';
    if (rec === 'daily') return 'ทุกวัน';
    if (rec === 'weekly') return 'ทุกสัปดาห์';
    if (rec === 'monthly') return 'ทุกเดือน';
    if (rec === 'yearly') return 'ทุกปี';
    if (rec.startsWith('monthly_')) {
        const num = rec.split('_')[1];
        return `ทุก ${num} เดือน`;
    }
    return rec;
  };

  const GroupHeader = ({ title, count, colorClass, icon: Icon }: any) => (
      <div className={`flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-white/5 ${colorClass}`}>
          <Icon size={18} />
          <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-medium">{count}</span>
      </div>
  );

  // Mortgage Logic Helper
  const calculateLoanDetails = (item: ReminderItem) => {
      const balanceField = item.fields.find(f => f.label.includes('ยอดหนี้') || f.label.includes('ยอดคงเหลือ') || f.label.includes('Balance'));
      const rateField = item.fields.find(f => f.label.includes('ดอกเบี้ย') || f.label.includes('Interest'));
      const paymentField = item.fields.find(f => f.label.includes('ค่างวด') || f.label.includes('ยอดชำระ') || f.label.includes('Payment'));
      const startDateField = item.fields.find(f => f.label.includes('เริ่มสัญญา') || f.label.includes('Start Date'));

      const balance = balanceField ? Number(balanceField.value) : 0;
      const rate = rateField ? Number(rateField.value) : 0;
      const payment = paymentField ? Number(paymentField.value) : 0;

      let monthlyInterest = 0;
      let monthlyPrincipal = 0;
      let refinanceDate = null;
      let daysToRefinance = null;
      let progressToRefinance = 0;

      // 1. Calculate Monthly Breakdown
      if (balance > 0 && rate > 0) {
          monthlyInterest = (balance * (rate / 100)) / 12;
          monthlyPrincipal = payment > monthlyInterest ? payment - monthlyInterest : 0;
      }

      // 2. Calculate Refinance Date (3 Years from Start)
      if (startDateField && startDateField.value) {
          const start = new Date(String(startDateField.value));
          const target = new Date(start);
          target.setFullYear(target.getFullYear() + 3);
          refinanceDate = target;

          const today = new Date();
          const totalDuration = target.getTime() - start.getTime();
          const elapsed = today.getTime() - start.getTime();
          
          daysToRefinance = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          progressToRefinance = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }

      return { 
          hasData: (balance > 0 && rate > 0 && payment > 0) || !!refinanceDate,
          balance, rate, payment, 
          monthlyInterest, monthlyPrincipal, 
          refinanceDate, daysToRefinance, progressToRefinance 
      };
  };

  const renderItem = (item: ReminderItem) => {
      const daysDiff = getDaysDiff(item.dueDate);
      const isUrgent = !item.isCompleted && (item.priority === 'high' || (daysDiff !== null && daysDiff < 0));
      const daysInfo = getDaysRemainingInfo(item.dueDate, item.isCompleted);
      
      let containerClass = "glass-panel group relative transition-all duration-300 p-5 rounded-3xl hover:bg-white/10 hover:shadow-glass hover:scale-[1.01] hover:border-white/20 mb-3 hover:opacity-100";
      
      // Calculate Opacity based on time remaining
      let opacityClass = "opacity-100"; // Default (overdue, today, tomorrow, or within 7 days)
      
      if (!item.isCompleted && daysDiff !== null) {
          if (daysDiff > 21) {
              opacityClass = "opacity-25"; // > 3 Weeks: 25% visibility
          } else if (daysDiff > 14) {
              opacityClass = "opacity-25"; // 3 Weeks: 25% visibility
          } else if (daysDiff > 7) {
              opacityClass = "opacity-50"; // 2 Weeks: 50% visibility
          }
      }

      if (item.isCompleted) {
          containerClass += " opacity-50 bg-black/10 grayscale";
      } else if (isUrgent) {
          // Urgent items stay clear
          containerClass += " opacity-100 bg-gradient-to-r from-red-500/10 via-transparent to-transparent border-l-[4px] border-l-red-500";
      } else {
          containerClass += ` border-l-[4px] border-l-transparent ${opacityClass}`;
      }

      return (
        <li key={item.id} className={containerClass}>
            <div className="flex items-start gap-4 relative">
                <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(item.id, item.isCompleted);
                }}
                className={`mt-1 transition-transform active:scale-75 flex-shrink-0 ${
                    item.isCompleted 
                    ? 'text-emerald-400' 
                    : isUrgent 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-white/30 hover:text-indigo-400'
                }`}
                >
                {item.isCompleted ? <CheckCircle2 size={26} className="fill-emerald-500/20" /> : <Circle size={26} strokeWidth={isUrgent ? 2.5 : 2} />}
                </button>
                
                <div className="flex-1 min-w-0 pr-16 md:pr-0 cursor-pointer" onClick={() => setViewingItem(item)}>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {/* Title Area */}
                    <div className="flex items-center gap-2">
                        {isUrgent && !item.isCompleted && (
                        <div className="animate-bounce-slow text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="สำคัญ/เร่งด่วน">
                            <Flame size={18} fill="currentColor" />
                        </div>
                        )}
                        <h3 className={`font-semibold text-lg truncate flex items-center gap-2 ${
                            item.isCompleted 
                            ? 'line-through text-white/40' 
                            : isUrgent
                            ? 'text-white drop-shadow-sm' 
                            : 'text-zinc-800 dark:text-white/90'
                        }`}>
                            <span>{item.title}</span>
                            {/* Days Remaining Text (Directly next to title) */}
                            {daysInfo && (
                                <span className={`text-xs ${daysInfo.color} whitespace-nowrap`}>
                                    {daysInfo.text}
                                </span>
                            )}
                        </h3>
                    </div>
                    
                    {/* Badges */}
                    {item.priority === 'high' && !item.isCompleted && (
                        <span className="text-[10px] px-2 py-0.5 border border-red-500/50 text-red-300 bg-red-900/30 rounded font-bold uppercase tracking-wider backdrop-blur-sm">High</span>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-white/50">
                    {item.dueDate && (
                    <div className={`flex items-center gap-1.5 ${isUrgent && !item.isCompleted ? 'text-red-300 font-medium' : ''}`}>
                        <Calendar size={14} />
                        <span>{new Date(item.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                    </div>
                    )}
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-zinc-600 dark:text-white/60">
                        <Tag size={12} />
                        {item.category}
                    </span>
                </div>

                {/* Quick Fields Preview */}
                {item.fields.length > 0 && !item.isCompleted && (
                    <div className="mt-3 text-xs text-white/40 flex flex-wrap gap-2">
                    {item.fields.slice(0, 3).map(f => (
                        <span key={f.id} className={`bg-black/20 border px-2 py-1 rounded-md shadow-sm backdrop-blur-sm ${isUrgent ? 'border-red-500/20' : 'border-white/5'}`}>
                        {f.label}: <span className="font-semibold text-white/70">{String(f.value)}</span>
                        </span>
                    ))}
                    {item.fields.length > 3 && <span className="py-1 px-2 opacity-50">+{item.fields.length - 3} more</span>}
                    </div>
                )}
                </div>

                {/* Actions (Floating on Mobile) */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute right-4 top-4 md:static z-20 bg-white/90 dark:bg-black/60 backdrop-blur-md md:bg-transparent p-1.5 rounded-xl border border-zinc-200 dark:border-white/10 md:border-transparent">
                
                {/* Snooze Button */}
                {!item.isCompleted && (
                    <div className="relative">
                        <button 
                            type="button"
                            title="เลื่อนเวลา (Snooze)"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSnoozeOpen(snoozeOpen === item.id ? null : item.id);
                            }} 
                            className="p-2 text-zinc-400 hover:text-orange-400 dark:text-white/40 hover:bg-white/10 rounded-xl transition"
                        >
                            <CalendarClock size={18} />
                        </button>
                        {snoozeOpen === item.id && (
                            <div className="absolute right-0 top-10 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 animate-scale-in">
                                <button onClick={() => { onSnooze(item.id, 'tomorrow'); setSnoozeOpen(null); }} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
                                    <Clock size={12} /> +1 วัน
                                </button>
                                <button onClick={() => { onSnooze(item.id, 'nextWeek'); setSnoozeOpen(null); }} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
                                    <Calendar size={12} /> +1 สัปดาห์
                                </button>
                            </div>
                        )}
                        {snoozeOpen === item.id && (
                            <div className="fixed inset-0 z-20" onClick={() => setSnoozeOpen(null)}></div>
                        )}
                    </div>
                )}

                {/* View Details Button (Eye Icon) */}
                <button 
                    type="button"
                    title="ดูรายละเอียด"
                    onClick={(e) => {
                    e.stopPropagation();
                    setViewingItem(item);
                    }} 
                    className="p-2 text-zinc-400 hover:text-blue-400 dark:text-white/40 hover:bg-white/10 rounded-xl transition"
                >
                    <Eye size={18} />
                </button>

                <button 
                    type="button"
                    title="แก้ไข"
                    onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                    }} 
                    className="p-2 text-zinc-400 hover:text-indigo-400 dark:text-white/40 hover:bg-white/10 rounded-xl transition"
                >
                    <Edit2 size={18} />
                </button>
                <button 
                    type="button"
                    title="คัดลอก"
                    onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(item);
                    }} 
                    className="p-2 text-zinc-400 hover:text-teal-400 dark:text-white/40 hover:bg-white/10 rounded-xl transition"
                >
                    <Copy size={18} />
                </button>
                <button 
                    type="button"
                    title="ลบ"
                    onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                    }} 
                    className="p-2 text-zinc-400 hover:text-red-400 dark:text-white/40 hover:bg-white/10 rounded-xl transition"
                >
                    <Trash2 size={18} />
                </button>
                </div>
            </div>
        </li>
      );
  };

  return (
    <div className="space-y-6">
      {/* Filters (Glass) */}
      <div className="flex flex-col md:flex-row gap-3 glass-panel p-3 rounded-[1.5rem] sticky top-0 z-20 backdrop-blur-xl">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3.5 text-zinc-500 dark:text-white/40 group-hover:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรือ Tags..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition text-zinc-800 dark:text-white placeholder-zinc-500 dark:placeholder-white/30"
          />
        </div>
        <div className="flex gap-2">
           <select 
             value={filterCategory} 
             onChange={(e) => setFilterCategory(e.target.value)}
             className="px-4 py-3 bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-700 dark:text-white/80 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer hover:bg-white/10 transition"
           >
             {categories.map(c => <option key={c} value={c} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white">{c === 'All' ? 'ทุกหมวดหมู่' : c}</option>)}
           </select>
           <select 
             value={filterStatus} 
             onChange={(e) => setFilterStatus(e.target.value as any)}
             className="px-4 py-3 bg-white/5 dark:bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-700 dark:text-white/80 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer hover:bg-white/10 transition"
           >
             <option value="All" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white">ทุกสถานะ</option>
             <option value="Pending" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white">รอดำเนินการ</option>
             <option value="Completed" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white">เสร็จสิ้น</option>
           </select>
        </div>
      </div>

      {/* Grouped List */}
      <div className="min-h-[400px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-zinc-500 dark:text-white/30 glass-panel rounded-3xl">
            <Filter size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="pb-10">
              {groupedItems.overdue.length > 0 && (
                  <div className="animate-fade-in">
                      <GroupHeader title="⚠️ เลยกำหนด (Overdue)" count={groupedItems.overdue.length} colorClass="text-red-400" icon={AlertCircle} />
                      <ul className="flex flex-col gap-0">{groupedItems.overdue.map(renderItem)}</ul>
                  </div>
              )}
              
              {groupedItems.today.length > 0 && (
                  <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
                      <GroupHeader title="📅 วันนี้ (Today)" count={groupedItems.today.length} colorClass="text-emerald-400" icon={Clock} />
                      <ul className="flex flex-col gap-0">{groupedItems.today.map(renderItem)}</ul>
                  </div>
              )}

              {groupedItems.tomorrow.length > 0 && (
                  <div className="animate-fade-in" style={{animationDelay: '0.15s'}}>
                      <GroupHeader title="🌅 พรุ่งนี้ (Tomorrow)" count={groupedItems.tomorrow.length} colorClass="text-orange-300" icon={Clock} />
                      <ul className="flex flex-col gap-0">{groupedItems.tomorrow.map(renderItem)}</ul>
                  </div>
              )}

              {groupedItems.thisWeek.length > 0 && (
                  <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
                      <GroupHeader title="🗓️ สัปดาห์นี้ (This Week)" count={groupedItems.thisWeek.length} colorClass="text-blue-300" icon={Calendar} />
                      <ul className="flex flex-col gap-0">{groupedItems.thisWeek.map(renderItem)}</ul>
                  </div>
              )}

              {groupedItems.later.length > 0 && (
                  <div className="animate-fade-in" style={{animationDelay: '0.25s'}}>
                      <GroupHeader title="🔜 อนาคต (Upcoming)" count={groupedItems.later.length} colorClass="text-zinc-400" icon={ChevronRight} />
                      <ul className="flex flex-col gap-0">{groupedItems.later.map(renderItem)}</ul>
                  </div>
              )}

              {groupedItems.noDate.length > 0 && (
                  <div className="animate-fade-in" style={{animationDelay: '0.3s'}}>
                      <GroupHeader title="📌 ไม่มีกำหนด (No Date)" count={groupedItems.noDate.length} colorClass="text-zinc-500" icon={Circle} />
                      <ul className="flex flex-col gap-0">{groupedItems.noDate.map(renderItem)}</ul>
                  </div>
              )}

              {groupedItems.completed.length > 0 && filterStatus !== 'Pending' && (
                  <div className="animate-fade-in mt-8" style={{animationDelay: '0.3s'}}>
                       <GroupHeader title="✅ เสร็จสิ้นแล้ว (Completed)" count={groupedItems.completed.length} colorClass="text-emerald-600/60" icon={CheckCircle2} />
                       <ul className="flex flex-col gap-0">{groupedItems.completed.map(renderItem)}</ul>
                  </div>
              )}
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4" onClick={() => setViewingItem(null)}>
           <div 
             className="glass-panel bg-zinc-900/90 rounded-[2.5rem] w-full max-w-2xl animate-scale-in border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       {viewingItem.isCompleted ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                             <CheckCircle2 size={12} /> Completed
                          </span>
                       ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">
                             <Clock size={12} /> Pending
                          </span>
                       )}
                       <span className="px-3 py-1 bg-white/10 text-white/60 text-xs font-bold rounded-full border border-white/5">
                          {viewingItem.category}
                       </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{viewingItem.title}</h2>
                 </div>
                 <button 
                   onClick={() => setViewingItem(null)}
                   className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition"
                 >
                   <X size={24} />
                 </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {/* Meta Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                           <Calendar size={20} />
                        </div>
                        <div>
                           <p className="text-xs text-white/40 font-medium">วันครบกำหนด</p>
                           <p className="text-sm font-bold text-white">
                              {viewingItem.dueDate ? new Date(viewingItem.dueDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : 'ไม่มีกำหนด'}
                           </p>
                        </div>
                     </div>
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400">
                           <Flag size={20} />
                        </div>
                        <div>
                           <p className="text-xs text-white/40 font-medium">ระดับความสำคัญ</p>
                           <p className="text-sm font-bold text-white uppercase">
                              {viewingItem.priority || 'Low'}
                           </p>
                        </div>
                     </div>
                     {viewingItem.recurrence && viewingItem.recurrence !== 'none' && (
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3 col-span-1 md:col-span-2">
                            <div className="p-2.5 bg-teal-500/20 rounded-xl text-teal-400">
                               <Repeat size={20} />
                            </div>
                            <div>
                               <p className="text-xs text-white/40 font-medium">การทำซ้ำ (Recurrence)</p>
                               <p className="text-sm font-bold text-white capitalize">{getRecurrenceLabel(viewingItem.recurrence)}</p>
                            </div>
                        </div>
                     )}
                  </div>

                  {/* START OF MORTGAGE CALCULATOR SECTION */}
                  {(() => {
                      const loan = calculateLoanDetails(viewingItem);
                      if (loan.hasData) {
                          return (
                              <div className="bg-gradient-to-br from-zinc-800 to-black p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-[50px] rounded-full pointer-events-none"></div>
                                  
                                  <h3 className="flex items-center gap-2 text-white font-bold mb-4 pb-2 border-b border-white/10 relative z-10">
                                      <Landmark size={20} className="text-indigo-400" />
                                      Financial Insight
                                  </h3>

                                  {/* Refinance Countdown */}
                                  {loan.refinanceDate && loan.daysToRefinance !== null && (
                                      <div className="mb-6 relative z-10">
                                          <div className="flex justify-between items-end mb-1">
                                              <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                                                  <Hourglass size={12} /> Refinance / Retention Countdown
                                              </span>
                                              <span className={`text-xs font-bold ${loan.daysToRefinance <= 90 ? 'text-red-400 animate-pulse' : 'text-white/60'}`}>
                                                  {loan.daysToRefinance <= 0 ? "ครบกำหนดแล้ว!" : `อีก ${loan.daysToRefinance} วัน`}
                                              </span>
                                          </div>
                                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                              <div 
                                                  className={`h-full rounded-full transition-all duration-1000 ${loan.daysToRefinance <= 90 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                                  style={{ width: `${loan.progressToRefinance}%` }}
                                              ></div>
                                          </div>
                                          <p className="text-[10px] text-white/40 mt-1 text-right">
                                              ครบกำหนด: {loan.refinanceDate.toLocaleDateString('th-TH')}
                                          </p>
                                      </div>
                                  )}

                                  {/* Monthly Breakdown Chart */}
                                  {loan.monthlyInterest > 0 && (
                                      <div className="relative z-10">
                                          <div className="flex justify-between items-center mb-3">
                                              <span className="text-xs text-white/50 font-medium">Monthly Breakdown (Estimated)</span>
                                          </div>
                                          
                                          {/* Stats Grid */}
                                          <div className="grid grid-cols-2 gap-3 mb-4">
                                              <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                                  <span className="text-[10px] text-red-300 block mb-0.5">เสียดอกเบี้ย (Interest)</span>
                                                  <span className="text-lg font-bold text-red-400">฿{loan.monthlyInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                              </div>
                                              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                                  <span className="text-[10px] text-emerald-300 block mb-0.5">ตัดเงินต้น (Principal)</span>
                                                  <span className="text-lg font-bold text-emerald-400">฿{loan.monthlyPrincipal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                              </div>
                                          </div>

                                          {/* Visual Bar */}
                                          <div className="flex h-4 rounded-full overflow-hidden w-full">
                                              <div 
                                                  className="bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center" 
                                                  style={{ width: `${(loan.monthlyInterest / loan.payment) * 100}%` }}
                                                  title={`ดอกเบี้ย ${((loan.monthlyInterest / loan.payment) * 100).toFixed(1)}%`}
                                              >
                                              </div>
                                              <div 
                                                  className="bg-emerald-500 hover:bg-emerald-400 transition-colors" 
                                                  style={{ width: `${(loan.monthlyPrincipal / loan.payment) * 100}%` }}
                                                  title={`เงินต้น ${((loan.monthlyPrincipal / loan.payment) * 100).toFixed(1)}%`}
                                              ></div>
                                          </div>
                                          <div className="flex justify-between mt-1 text-[10px] text-white/40">
                                              <span>{((loan.monthlyInterest / loan.payment) * 100).toFixed(0)}% Interest</span>
                                              <span>{((loan.monthlyPrincipal / loan.payment) * 100).toFixed(0)}% Principal</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      }
                      return null;
                  })()}
                  {/* END OF MORTGAGE CALCULATOR SECTION */}

                  {/* Custom Fields */}
                  {viewingItem.fields.length > 0 && (
                      <div>
                          <h3 className="flex items-center gap-2 text-white/80 font-bold mb-3 pb-2 border-b border-white/10">
                              <Layers size={18} className="text-indigo-400" /> ข้อมูลเพิ่มเติม
                          </h3>
                          <div className="grid grid-cols-1 gap-3">
                              {viewingItem.fields.map(field => (
                                  <div key={field.id} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white/5 p-3.5 rounded-xl border border-white/5 hover:bg-white/10 transition">
                                      <span className="text-sm text-white/50 font-medium mb-1 md:mb-0 flex items-center gap-2">
                                          <FileText size={14} /> {field.label}
                                      </span>
                                      <span className="text-base font-bold text-white pl-6 md:pl-0 break-all">
                                          {field.type === 'checkbox' ? (field.value ? '✅ ใช่' : '❌ ไม่ใช่') : field.value}
                                          {field.label.includes('ดอกเบี้ย') && '%'}
                                          {(field.label.includes('ยอด') || field.label.includes('ค่า')) && !field.label.includes('%') && ' บาท'}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Tags */}
                  {viewingItem.tags.length > 0 && (
                      <div>
                          <h3 className="flex items-center gap-2 text-white/80 font-bold mb-3 pb-2 border-b border-white/10">
                              <Hash size={18} className="text-indigo-400" /> Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                              {viewingItem.tags.map((tag, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-medium border border-indigo-500/20">
                                      #{tag}
                                  </span>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Timestamps */}
                  <div className="pt-4 mt-4 border-t border-white/10 text-xs text-white/30 flex justify-between">
                      <span>Created: {new Date(viewingItem.createdAt).toLocaleDateString('th-TH')}</span>
                      <span>Last Updated: {new Date(viewingItem.updatedAt).toLocaleDateString('th-TH')}</span>
                  </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
         @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
         }
         .animate-bounce-slow {
            animation: bounce-slow 2s infinite;
         }
      `}</style>
    </div>
  );
};

export default ReminderList;