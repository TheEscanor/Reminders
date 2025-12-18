import React, { useState, useEffect, useMemo } from 'react';
import { ReminderItem, CustomField, Template } from '../types';
import { Plus, X, Save, Car, Heart, Home, Box, ChevronDown, ChevronUp, AlertCircle, Zap, Droplets, Plane, Wifi, Trash2, Landmark, Info, Sparkles, Wand2, ShieldAlert } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ItemFormProps {
  initialItem?: ReminderItem | null;
  onSave: (item: ReminderItem) => void;
  onCancel: () => void;
}

const TEMPLATES: Template[] = [
  { 
    id: 't-car', name: 'ผ่อนรถยนต์', category: 'ยานพาหนะ', icon: 'car',
    defaultFields: [
      { label: 'ยอดคงเหลือทั้งหมด', type: 'number' },
      { label: 'จ่ายเดือนละ (ยอดชำระ)', type: 'number' },
      { label: 'เลขไมล์ล่าสุด (กม.)', type: 'number' },
      { label: 'ทะเบียนรถ', type: 'text' }
    ]
  },
  {
    id: 't-mortgage', name: 'สินเชื่อบ้าน/รีไฟแนนซ์', category: 'การเงิน & สินทรัพย์', icon: 'landmark',
    defaultFields: [
        { label: 'วันเริ่มสัญญา (Start Date)', type: 'date' },
        { label: 'ธนาคารปัจจุบัน', type: 'text' },
        { label: 'อัตราดอกเบี้ยปัจจุบัน (%)', type: 'number' },
        { label: 'ยอดหนี้คงเหลือ', type: 'number' },
        { label: 'ค่างวดต่อเดือน', type: 'number' }
    ]
  },
  { 
    id: 't-health', name: 'สุขภาพ', category: 'สุขภาพ', icon: 'heart',
    defaultFields: [
      { label: 'โรงพยาบาล', type: 'text' },
      { label: 'แพทย์ผู้รักษา', type: 'text' },
      { label: 'ต้องงดอาหารก่อนตรวจ', type: 'checkbox' }
    ]
  },
  { 
    id: 't-home', name: 'งานบ้าน', category: 'ที่อยู่อาศัย', icon: 'home',
    defaultFields: [
      { label: 'ตำแหน่งอุปกรณ์', type: 'text' },
      { label: 'ยี่ห้อ/รุ่น', type: 'text' }
    ]
  },
  {
    id: 't-electricity', name: 'ค่าไฟ', category: 'บิล & สาธารณูปโภค', icon: 'zap',
    defaultFields: [
        { label: 'จำนวนหน่วย (Unit)', type: 'number' },
        { label: 'ยอดเงินที่ต้องชำระ (บาท)', type: 'number' },
        { label: 'เลขผู้ใช้ไฟ (Ref)', type: 'text' }
    ]
  },
  {
    id: 't-water', name: 'ค่าน้ำ', category: 'บิล & สาธารณูปโภค', icon: 'droplets',
    defaultFields: [
        { label: 'จำนวนหน่วยน้ำ', type: 'number' },
        { label: 'ยอดเงินที่ต้องชำระ (บาท)', type: 'number' }
    ]
  },
  {
    id: 't-internet', name: 'อินเตอร์เน็ต', category: 'บิล & สาธารณูปโภค', icon: 'wifi',
    defaultFields: [
        { label: 'ผู้ให้บริการ (ISP)', type: 'text' },
        { label: 'แพ็คเกจความเร็ว', type: 'text' },
        { label: 'ค่าบริการรายเดือน', type: 'number' }
    ]
  },
  {
    id: 't-travel', name: 'เที่ยว', category: 'ท่องเที่ยว', icon: 'plane',
    defaultFields: [
        { label: 'สถานที่ (Destination)', type: 'text' },
        { label: 'งบประมาณ (Budget)', type: 'number' },
        { label: 'จองที่พักแล้ว', type: 'checkbox' },
        { label: 'จำนวนวัน', type: 'number' }
    ]
  }
];

const SENSITIVE_KEYWORDS = [
  'password', 'รหัสผ่าน', 'pin', 'atm', 'cvv', 'credit card', 'บัตรเครดิต', 
  'login', 'username', 'user', 'key', 'secret', 'ความลับ', 'รหัสลับ'
];

const ItemForm: React.FC<ItemFormProps> = ({ initialItem, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ทั่วไป');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [recurrence, setRecurrence] = useState<string>('none');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  
  // State for toggling tips section
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setCategory(initialItem.category);
      setDueDate(initialItem.dueDate || '');
      setTags(initialItem.tags.join(', '));
      setFields(initialItem.fields);
      setRecurrence(initialItem.recurrence || 'none');
      setPriority(initialItem.priority || 'low');
    }
  }, [initialItem]);

  // Security Check Logic
  const securityWarning = useMemo(() => {
    const inputsToCheck = [
        title, 
        tags, 
        ...fields.map(f => f.label), 
        ...fields.map(f => String(f.value))
    ];
    
    const foundKeyword = inputsToCheck.find(input => 
        SENSITIVE_KEYWORDS.some(keyword => input.toLowerCase().includes(keyword))
    );

    return foundKeyword ? true : false;
  }, [title, tags, fields]);

  const applyTemplate = (template: Template) => {
    setCategory(template.category);
    
    // Auto-set title based on template for convenience
    if (!title && !initialItem) {
        if (template.id === 't-mortgage') setTitle('ผ่อนบ้าน/คอนโด');
        if (template.id === 't-car') setTitle('ผ่อนรถยนต์');
    }

    const newFields = template.defaultFields.map(f => ({
      ...f,
      id: uuidv4(),
      value: f.type === 'checkbox' ? false : ''
    }));
    setFields([...fields, ...newFields as CustomField[]]);
  };

  // Helper to load demo data for Mortgage
  const loadDemoMortgage = () => {
    setTitle('สินเชื่อบ้าน (ตัวอย่าง)');
    setCategory('ที่อยู่อาศัย');
    // Due date next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(5); // Due on 5th
    setDueDate(nextMonth.toISOString().split('T')[0]);
    
    setRecurrence('monthly');
    setPriority('high');
    setTags('บ้าน, สำคัญ, หักบัญชี');
    
    // Calculate a start date that is about 2 years and 10 months ago
    // To demonstrate the "Refinance Alert" appearing soon
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 34); // ~2 years 10 months ago

    setFields([
        { id: uuidv4(), label: 'วันเริ่มสัญญา (Start Date)', type: 'date', value: startDate.toISOString().split('T')[0] },
        { id: uuidv4(), label: 'ยอดหนี้คงเหลือ', type: 'number', value: 2500000 },
        { id: uuidv4(), label: 'อัตราดอกเบี้ยปัจจุบัน (%)', type: 'number', value: 3.25 },
        { id: uuidv4(), label: 'ค่างวด (ยอดชำระ)', type: 'number', value: 14500 },
        { id: uuidv4(), label: 'ธนาคารปัจจุบัน', type: 'text', value: 'ธอส. (ตัวอย่าง)' }
    ]);
  };

  // Helper to load demo data for Car Loan
  const loadDemoCarLoan = () => {
    setTitle('ผ่อนรถยนต์ Honda Civic (ตัวอย่าง)');
    setCategory('ยานพาหนะ');
    // Due date next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // Due on 1st
    setDueDate(nextMonth.toISOString().split('T')[0]);
    
    setRecurrence('monthly');
    setPriority('medium');
    setTags('รถยนต์, ผ่อนรถ, สำคัญ');
    
    setFields([
        { id: uuidv4(), label: 'ยอดคงเหลือทั้งหมด', type: 'number', value: 450000 },
        { id: uuidv4(), label: 'จ่ายเดือนละ (ยอดชำระ)', type: 'number', value: 9500 },
        { id: uuidv4(), label: 'เลขไมล์ล่าสุด (กม.)', type: 'number', value: 125000 },
        { id: uuidv4(), label: 'ทะเบียนรถ', type: 'text', value: '1กข 9999' }
    ]);
  };

  const addField = () => {
    setFields([...fields, { id: uuidv4(), label: 'ข้อมูลใหม่', type: 'text', value: '' }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };
  
  const clearAllFields = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    setFields([]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ReminderItem = {
      id: initialItem?.id || uuidv4(),
      title,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      fields,
      dueDate: dueDate || null,
      recurrence: recurrence as any,
      priority,
      isCompleted: initialItem?.isCompleted || false,
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(item);
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'car': return <Car size={16} />;
      case 'landmark': return <Landmark size={16} />;
      case 'heart': return <Heart size={16} />;
      case 'home': return <Home size={16} />;
      case 'zap': return <Zap size={16} />;
      case 'droplets': return <Droplets size={16} />;
      case 'plane': return <Plane size={16} />;
      case 'wifi': return <Wifi size={16} />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="glass-panel bg-white/80 dark:bg-zinc-900/90 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh] transform transition-all backdrop-blur-2xl">
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/20">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white">{initialItem ? 'แก้ไขรายการ' : 'สร้างรายการใหม่'}</h2>
        <button onClick={onCancel} className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-white/40 dark:hover:text-white hover:bg-white/10 rounded-full transition">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* Templates */}
        {!initialItem && (
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
                <p className="text-xs font-bold text-zinc-500 dark:text-white/40 uppercase tracking-wider">เลือกเทมเพลตเริ่มต้น</p>
                <div className="flex gap-2">
                    <button 
                        type="button" 
                        onClick={loadDemoCarLoan}
                        className="text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-bold bg-amber-100/50 dark:bg-amber-500/20 px-3 py-1.5 rounded-lg transition border border-amber-200 dark:border-amber-500/30 animate-pulse"
                    >
                        <Car size={12} /> ลองกรอก: ผ่อนรถ
                    </button>
                    <button 
                        type="button" 
                        onClick={loadDemoMortgage}
                        className="text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 font-bold bg-indigo-100/50 dark:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition border border-indigo-200 dark:border-indigo-500/30 animate-pulse"
                    >
                        <Wand2 size={12} /> ลองกรอก: สินเชื่อบ้าน
                    </button>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 dark:bg-black/30 hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 transition border border-white/5 hover:border-indigo-500/30"
                >
                  {getIcon(t.icon)}
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECURITY WARNING BANNER */}
        {securityWarning && (
            <div className="mb-6 animate-bounce-slow">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-4 backdrop-blur-md">
                    <div className="p-2 bg-red-500/20 rounded-full text-red-500 shrink-0">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-600 dark:text-red-400">คำเตือนความปลอดภัย (Security Warning)</h4>
                        <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-1 leading-relaxed">
                            ระบบตรวจพบคำว่า <b>"รหัสผ่าน", "Password" หรือ "PIN"</b> <br/>
                            <span className="underline decoration-wavy decoration-red-400">ห้ามบันทึก</span> รหัสผ่านธนาคาร, รหัสบัตรเครดิต หรือข้อมูลความลับลงในแอพนี้เด็ดขาด เนื่องจากข้อมูลไม่ได้ถูกเข้ารหัสและอาจไม่ปลอดภัย
                        </p>
                    </div>
                </div>
            </div>
        )}

        <form id="item-form" onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">ชื่อรายการ</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 dark:bg-black/30 border rounded-xl focus:ring-2 outline-none transition text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 ${securityWarning ? 'border-red-500/50 focus:ring-red-500' : 'border-zinc-200 dark:border-white/10 focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                placeholder="เช่น เปลี่ยนถ่ายน้ำมันเครื่อง"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">หมวดหมู่</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                placeholder="ทั่วไป"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">วันครบกำหนด (ถ้ามี)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition text-zinc-900 dark:text-white appearance-none"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">ความถี่ (Recurrence)</label>
              <div className="relative">
                <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition text-zinc-900 dark:text-white appearance-none"
                >
                    <option value="none" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ไม่ทำซ้ำ</option>
                    <option value="daily" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ทุกวัน</option>
                    <option value="weekly" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ทุกสัปดาห์</option>
                    <option value="monthly" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ทุกเดือน</option>
                    {Array.from({ length: 10 }, (_, i) => i + 2).map(num => (
                        <option key={num} value={`monthly_${num}`} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            ทุก {num} เดือน
                        </option>
                    ))}
                    <option value="yearly" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ทุกปี</option>
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-zinc-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          {/* Compact Priority Selection */}
          <div>
             <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">ระดับความสำคัญ</label>
             <div className="flex gap-2">
                <label className={`flex-1 relative cursor-pointer border rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all ${priority === 'low' ? 'bg-zinc-100/50 border-zinc-300 ring-1 ring-zinc-200 dark:bg-white/10 dark:border-white/20 dark:ring-white/10' : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                    <input type="radio" name="priority" value="low" checked={priority === 'low'} onChange={() => setPriority('low')} className="hidden" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">ทั่วไป</span>
                </label>
                <label className={`flex-1 relative cursor-pointer border rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all ${priority === 'medium' ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:border-amber-500/50 dark:ring-amber-500/30' : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                    <input type="radio" name="priority" value="medium" checked={priority === 'medium'} onChange={() => setPriority('medium')} className="hidden" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">ปานกลาง</span>
                </label>
                <label className={`flex-1 relative cursor-pointer border rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all ${priority === 'high' ? 'bg-red-50 border-red-300 ring-1 ring-red-200 dark:bg-red-900/30 dark:border-red-500/50 dark:ring-red-500/30' : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                    <input type="radio" name="priority" value="high" checked={priority === 'high'} onChange={() => setPriority('high')} className="hidden" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">สำคัญมาก</span>
                </label>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tags (คั่นด้วยเครื่องหมายจุลภาค)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
              placeholder="สำคัญ, รถยนต์, เร่งด่วน"
            />
          </div>

          {/* Dynamic Fields Section */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                 <Box size={16} className="text-indigo-500 dark:text-indigo-400" />
                 ข้อมูลเพิ่มเติม (Custom Fields)
              </label>
              <div className="flex gap-2">
                {fields.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFields}
                    className="text-xs flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-500/20 px-3 py-1.5 rounded-lg transition"
                  >
                    <Trash2 size={14} /> ลบทุกฟิลด์
                  </button>
                )}
                <button
                    type="button"
                    onClick={addField}
                    className="text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 font-bold bg-indigo-50 dark:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition"
                >
                    <Plus size={14} /> เพิ่มฟิลด์
                </button>
              </div>
            </div>

            {/* Collapsible Keyword Guidelines (Enhanced Readability) */}
            <div className="mb-5 bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300">
                {/* Header / Toggle Button */}
                <button 
                  type="button"
                  onClick={() => setIsTipsOpen(!isTipsOpen)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition"
                >
                    <div className="flex gap-3 items-center">
                        <div className="bg-indigo-500 text-white p-1.5 rounded-full shrink-0">
                            <Info size={16} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">เคล็ดลับการใช้งาน & คำแนะนำ (Tips)</span>
                    </div>
                    {isTipsOpen ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
                </button>
                
                {/* Collapsible Content */}
                {isTipsOpen && (
                    <div className="p-5 pt-0 text-sm text-zinc-700 dark:text-zinc-200 border-t border-indigo-100 dark:border-indigo-500/20 mt-2">
                       <div className="space-y-4 w-full pt-2">
                          {/* Section 1: Auto-Balance */}
                          <div>
                            <p className="font-bold text-base text-indigo-700 dark:text-indigo-400">💡 เคล็ดลับการคำนวณยอดหนี้อัตโนมัติ (Auto-Balance):</p>
                            <ul className="list-disc list-inside space-y-1.5 mt-1.5 ml-1">
                               <li>ตั้งชื่อฟิลด์ยอดหนี้ว่า: <span className="font-semibold text-zinc-900 dark:text-white border-b border-indigo-500/30">"ยอดคงเหลือ", "หนี้คงเหลือ", "Balance"</span></li>
                               <li>ตั้งชื่อฟิลด์ค่างวดว่า: <span className="font-semibold text-zinc-900 dark:text-white border-b border-indigo-500/30">"จ่ายเดือนละ", "ยอดชำระ", "ค่างวด"</span></li>
                            </ul>
                            <p className="opacity-80 pt-1.5 text-xs">
                                * เมื่อกด "เสร็จสิ้น" รายการ ระบบจะสร้างรายการรอบถัดไปและหักลบยอดคงเหลือให้ทันที
                            </p>
                          </div>

                          {/* Section 2: Refinance */}
                          <div className="pt-3 border-t border-indigo-200 dark:border-white/10">
                            <p className="font-bold text-base text-indigo-700 dark:text-indigo-400">🏠 ระบบช่วยเตือนรีไฟแนนซ์บ้าน (AI Refinance Alert):</p>
                            <p className="mt-1.5 leading-relaxed">
                               เพียงเพิ่มฟิลด์ชื่อ <span className="font-semibold text-zinc-900 dark:text-white border-b border-indigo-500/30">"วันเริ่มสัญญา"</span> หรือ <span className="font-semibold text-zinc-900 dark:text-white border-b border-indigo-500/30">"Start Date"</span>
                            </p>
                            <p className="opacity-80 pt-1.5 text-xs">
                               * AI จะช่วยคำนวณและแจ้งเตือนเมื่อใกล้ครบกำหนด 3 ปี (Retention) ให้คุณทราบผ่านหน้า "AI Assistant" หรือ "Insight"
                            </p>
                          </div>

                          {/* Section 3: Mortgage Calculator */}
                           <div className="pt-3 border-t border-indigo-200 dark:border-white/10">
                            <p className="font-bold text-base text-indigo-700 dark:text-indigo-400">📊 คำนวณดอกเบี้ย vs เงินต้น (Mortgage Calculator):</p>
                             <p className="mt-1.5 leading-relaxed">
                               เพื่อให้ระบบแสดงกราฟตัดเงินต้น กรุณากรอกฟิลด์ให้ครบ: <br/>
                               1. <span className="font-semibold">"ยอดหนี้คงเหลือ"</span> <br/>
                               2. <span className="font-semibold">"ดอกเบี้ย (%)"</span> <br/>
                               3. <span className="font-semibold">"ค่างวด"</span>
                            </p>
                          </div>
                       </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-2 bg-white/5 dark:bg-black/20 p-3 rounded-xl border border-zinc-200 dark:border-white/10 group hover:border-indigo-300 dark:hover:border-indigo-500/50 transition">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className={`w-full px-2 py-1.5 bg-transparent border-b outline-none text-sm font-medium placeholder-zinc-400 ${securityWarning && SENSITIVE_KEYWORDS.some(k => field.label.toLowerCase().includes(k)) ? 'border-red-400 text-red-500' : 'border-zinc-300 dark:border-zinc-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-700 dark:text-zinc-200'}`}
                      placeholder="ชื่อหัวข้อ (เช่น ยอดคงเหลือ)"
                    />
                  </div>
                  <div className="flex-[0.5]">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-300 outline-none"
                    >
                      <option value="text" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ข้อความ</option>
                      <option value="number" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">ตัวเลข</option>
                      <option value="date" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">วันที่</option>
                      <option value="checkbox" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Checkbox</option>
                    </select>
                  </div>
                  <div className="flex-1">
                     {field.type === 'checkbox' ? (
                        <div className="flex items-center h-full">
                           <input
                            type="checkbox"
                            checked={!!field.value}
                            onChange={(e) => updateField(field.id, { value: e.target.checked })}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-zinc-300 rounded cursor-pointer"
                           />
                           <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">{field.value ? 'ใช่' : 'ไม่'}</span>
                        </div>
                     ) : (
                        <input
                            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                            value={field.value as string}
                            onChange={(e) => updateField(field.id, { value: e.target.value })}
                            className={`w-full px-3 py-1.5 bg-white/50 dark:bg-black/30 border rounded-lg text-sm focus:border-indigo-500 outline-none ${securityWarning && SENSITIVE_KEYWORDS.some(k => String(field.value).toLowerCase().includes(k)) ? 'border-red-500/50 text-red-500' : 'border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
                            placeholder="ข้อมูล..."
                        />
                     )}
                  </div>
                  <button type="button" onClick={() => removeField(field.id)} className="text-zinc-300 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-1">
                    <X size={18} />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">ยังไม่มีข้อมูลเพิ่มเติม</p>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>

      <div className="p-5 border-t border-white/10 bg-white/5 dark:bg-black/20 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-zinc-600 dark:text-white/60 text-sm font-bold hover:bg-white/10 rounded-xl transition backdrop-blur-sm"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          form="item-form"
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
        >
          <Save size={18} /> บันทึก
        </button>
      </div>
    </div>
  );
};

export default ItemForm;