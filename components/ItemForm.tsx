import React, { useState, useEffect } from 'react';
import { ReminderItem, CustomField } from '../types';
import { Plus, X, Save, Box, Trash2, Info, Wand2, ShieldAlert, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { translations, Lang } from '../i18n';

interface ItemFormProps {
  initialItem?: ReminderItem | null;
  onSave: (item: ReminderItem) => void;
  onCancel: () => void;
  lang: Lang;
}

const ItemForm: React.FC<ItemFormProps> = ({ initialItem, onSave, onCancel, lang }) => {
  const t = translations[lang] as any;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(lang === 'th' ? 'ทั่วไป' : 'General');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [recurrence, setRecurrence] = useState<string>('none');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title); setCategory(initialItem.category); setDueDate(initialItem.dueDate || '');
      setTags(initialItem.tags.join(', ')); setFields(initialItem.fields); setRecurrence(initialItem.recurrence || 'none');
      setPriority(initialItem.priority || 'low');
    }
  }, [initialItem]);

  const addField = () => setFields([...fields, { id: uuidv4(), label: lang === 'th' ? 'ข้อมูลใหม่' : 'New Field', type: 'text', value: '' }]);
  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));
  const updateField = (id: string, updates: Partial<CustomField>) => setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: initialItem?.id || uuidv4(), title, category, tags: tags.split(',').map(t => t.trim()).filter(Boolean), fields, dueDate: dueDate || null, recurrence, priority, isCompleted: initialItem?.isCompleted || false, createdAt: initialItem?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  return (
    <div className="glass-panel bg-white/80 dark:bg-zinc-900/90 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col backdrop-blur-2xl">
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/20">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white">{initialItem ? t.editItem : t.createNew}</h2>
        <button onClick={onCancel} className="p-2 text-zinc-500 dark:text-white/40 hover:bg-white/10 rounded-full"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
        {/* Collapsible Tips Section */}
        <div className="mb-6">
          <button 
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center justify-between p-4 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-2xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-500/20"
          >
            <div className="flex items-center gap-3">
              <Lightbulb size={20} />
              <span className="text-sm font-bold">{t.tipsTitle}</span>
            </div>
            {showTips ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showTips && (
            <div className="mt-2 p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/5 text-xs space-y-2 text-zinc-600 dark:text-zinc-400 animate-fade-in">
              <p className="font-bold text-indigo-500">{t.tipsAuto}</p>
              <p>{t.tipsDeduction}</p>
              <p>{t.tipsBalance}</p>
              <p>{t.tipsHome}</p>
            </div>
          )}
        </div>

        <form id="item-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="block text-sm font-medium mb-2">{lang === 'th' ? 'ชื่อรายการ' : 'Title'}</label><input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-zinc-200 dark:border-white/10 rounded-xl outline-none" /></div>
            <div><label className="block text-sm font-medium mb-2">{t.category}</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-zinc-200 dark:border-white/10 rounded-xl outline-none" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="block text-sm font-medium mb-2">{t.dueDate}</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-zinc-200 dark:border-white/10 rounded-xl outline-none" /></div>
            <div>
              <label className="block text-sm font-medium mb-2">{lang === 'th' ? 'ความถี่' : 'Recurrence'}</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl outline-none">
                <option value="none">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium mb-2">{t.priority}</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p: any) => (
                <button key={p} type="button" onClick={() => setPriority(p)} className={`flex-1 py-2 rounded-xl border text-sm font-bold ${priority === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent border-zinc-200 dark:border-white/10'}`}>{t[p as keyof typeof t]}</button>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center mb-4"><label className="text-sm font-bold flex items-center gap-2"><Box size={16} className="text-indigo-500" /> {t.addMoreFields}</label><button type="button" onClick={addField} className="text-xs bg-indigo-50 dark:bg-white/5 text-indigo-600 px-3 py-1.5 rounded-lg"><Plus size={14} /></button></div>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex gap-2 bg-black/5 p-3 rounded-xl border border-zinc-200 dark:border-white/10">
                  <input type="text" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="flex-1 bg-transparent border-b outline-none text-sm" />
                  <input type="text" value={field.value as string} onChange={(e) => updateField(field.id, { value: e.target.value })} className="flex-1 bg-white/50 dark:bg-black/30 border rounded-lg px-2 text-sm outline-none" />
                  <button type="button" onClick={() => removeField(field.id)} className="text-zinc-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
      <div className="p-5 border-t border-white/10 flex justify-end gap-3"><button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold">{t.cancel}</button><button type="submit" form="item-form" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg">{t.save}</button></div>
    </div>
  );
};

export default ItemForm;