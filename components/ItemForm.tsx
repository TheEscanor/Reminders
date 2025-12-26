import React, { useState, useEffect } from 'react';
import { ReminderItem, CustomField, FieldType } from '../types';
import { 
  Plus, X, Save, Box, Trash2, Info, Wand2, ShieldAlert, 
  ChevronDown, ChevronUp, Lightbulb, Home, Layout, 
  Car, Heart, Zap, Droplets, Wifi, Plane, Landmark, RefreshCcw
} from 'lucide-react';
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
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title); 
      setCategory(initialItem.category); 
      setDueDate(initialItem.dueDate || '');
      setTags(initialItem.tags.join(', ')); 
      setFields(initialItem.fields);
      setPriority(initialItem.priority || 'low');

      // Parse recurrence (e.g., "monthly-3")
      if (initialItem.recurrence && initialItem.recurrence !== 'none') {
        const parts = initialItem.recurrence.split('-');
        if (parts.length === 2) {
          setRecurrenceType(parts[0]);
          setRecurrenceInterval(parseInt(parts[1]) || 1);
        } else {
          setRecurrenceType(initialItem.recurrence);
          setRecurrenceInterval(1);
        }
      } else {
        setRecurrenceType('none');
      }
    }
  }, [initialItem]);

  const addField = () => setFields([...fields, { id: uuidv4(), label: lang === 'th' ? 'ข้อมูลใหม่' : 'New Field', type: 'text', value: '' }]);
  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));
  const updateField = (id: string, updates: Partial<CustomField>) => setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));

  const applyPreset = (type: 'car' | 'home' | 'health' | 'housework' | 'electric' | 'water' | 'internet' | 'travel') => {
    let presetTitle = "";
    let presetCategory = "";
    let presetFields: CustomField[] = [];

    switch (type) {
      case 'car':
        presetTitle = t.titleCar;
        presetCategory = lang === 'th' ? 'ยานพาหนะ' : 'Vehicle';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'วันเริ่มสัญญา (Start Date)' : 'Start Date', type: 'date', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'งวดที่' : 'Installment No.', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ยอดชำระต่อเดือน' : 'Monthly Payment', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ยอดคงเหลือ' : 'Remaining Balance', type: 'number', value: '' },
        ];
        break;
      case 'home':
        presetTitle = t.titleHome;
        presetCategory = lang === 'th' ? 'การเงิน/บ้าน' : 'Finance/Home';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'วันเริ่มสัญญา (Start Date)' : 'Start Date', type: 'date', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ยอดหนี้คงเหลือ' : 'Outstanding Balance', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'อัตราดอกเบี้ยปัจจุบัน (%)' : 'Current Interest (%)', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ค่างวด (ยอดชำระ)' : 'Monthly Installment', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ธนาคารปัจจุบัน' : 'Current Bank', type: 'text', value: '' },
        ];
        break;
      case 'health':
        presetTitle = t.titleHealth;
        presetCategory = lang === 'th' ? 'สุขภาพ' : 'Health';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'รายการ/อาการ' : 'Symptom/Checkup', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'สถานที่/โรงพยาบาล' : 'Location', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ค่าใช้จ่าย' : 'Expenses', type: 'number', value: '' },
        ];
        break;
      case 'housework':
        presetTitle = t.titleHousework;
        presetCategory = lang === 'th' ? 'งานบ้าน' : 'Housework';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'รายละเอียดงาน' : 'Task Details', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ผู้รับผิดชอบ' : 'Assigned To', type: 'text', value: '' },
        ];
        break;
      case 'electric':
        presetTitle = t.titleElectric;
        presetCategory = lang === 'th' ? 'สาธารณูปโภค' : 'Utility';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'เลขมิเตอร์' : 'Meter No.', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'จำนวนหน่วย' : 'Units Used', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ยอดชำระ' : 'Amount Due', type: 'number', value: '' },
        ];
        break;
      case 'water':
        presetTitle = t.titleWater;
        presetCategory = lang === 'th' ? 'สาธารณูปโภค' : 'Utility';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'ยอดชำระ' : 'Amount Due', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'เลขอ่านมิเตอร์' : 'Meter Reading', type: 'number', value: '' },
        ];
        break;
      case 'internet':
        presetTitle = t.titleInternet;
        presetCategory = lang === 'th' ? 'สาธารณูปโภค' : 'Utility';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'รหัสลูกค้า' : 'Customer ID', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'ยอดชำระ' : 'Amount Due', type: 'number', value: '' },
        ];
        break;
      case 'travel':
        presetTitle = t.titleTravel;
        presetCategory = lang === 'th' ? 'ท่องเที่ยว' : 'Travel';
        presetFields = [
          { id: uuidv4(), label: lang === 'th' ? 'สถานที่' : 'Destination', type: 'text', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'งบประมาณ' : 'Budget', type: 'number', value: '' },
          { id: uuidv4(), label: lang === 'th' ? 'แพลนการเดินทาง' : 'Travel Plan', type: 'text', value: '' },
        ];
        break;
    }

    setTitle(presetTitle);
    setCategory(presetCategory);
    setFields(presetFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecurrence = recurrenceType === 'none' ? 'none' : `${recurrenceType}-${recurrenceInterval}`;
    
    onSave({ 
      id: initialItem?.id || uuidv4(), 
      title, 
      category, 
      tags: tags.split(',').map(t => t.trim()).filter(Boolean), 
      fields, 
      dueDate: dueDate || null, 
      recurrence: finalRecurrence, 
      priority, 
      isCompleted: initialItem?.isCompleted || false, 
      createdAt: initialItem?.createdAt || new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    });
  };

  const PresetButton = ({ icon: Icon, label, type }: { icon: any, label: string, type: any }) => (
    <button 
      type="button" 
      onClick={() => applyPreset(type)}
      className="flex items-center gap-2 px-3 py-2.5 bg-zinc-100 dark:bg-black/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-zinc-200 dark:border-white/5 rounded-xl text-[13px] font-bold transition-all active:scale-95 group"
    >
      <Icon size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" /> 
      <span>{label}</span>
    </button>
  );

  const getUnitLabel = () => {
    switch (recurrenceType) {
      case 'daily': return t.unitDay;
      case 'weekly': return t.unitWeek;
      case 'monthly': return t.unitMonth;
      case 'yearly': return t.unitYear;
      default: return '';
    }
  };

  return (
    <div className="glass-panel bg-white/80 dark:bg-zinc-900/90 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col backdrop-blur-2xl max-h-[95vh]">
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/20">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white">{initialItem ? t.editItem : t.createNew}</h2>
        <button onClick={onCancel} className="p-2 text-zinc-500 dark:text-white/40 hover:bg-white/10 rounded-full"><X size={20} /></button>
      </div>
      
      <div className="p-6 overflow-y-auto custom-scrollbar">
        {/* Presets Grid Header */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-4 text-xs font-black text-zinc-400 dark:text-white/30 uppercase tracking-[0.2em]">
              <Layout size={14} /> {t.applyPreset}
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <PresetButton icon={Car} label={t.presetCar} type="car" />
              <PresetButton icon={Landmark} label={t.presetHome} type="home" />
              <PresetButton icon={Heart} label={t.presetHealth} type="health" />
              <PresetButton icon={Home} label={t.presetHousework} type="housework" />
              <PresetButton icon={Zap} label={t.presetElectric} type="electric" />
              <PresetButton icon={Droplets} label={t.presetWater} type="water" />
              <PresetButton icon={Wifi} label={t.presetInternet} type="internet" />
              <PresetButton icon={Plane} label={t.presetTravel} type="travel" />
           </div>
        </div>

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
            
            {/* Flexible Recurrence Section */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <RefreshCcw size={14} className="text-indigo-500" />
                {lang === 'th' ? 'ความถี่ / การทำซ้ำ' : 'Recurrence'}
              </label>
              <div className="flex flex-col gap-2">
                <select 
                  value={recurrenceType} 
                  onChange={(e) => setRecurrenceType(e.target.value)} 
                  className="w-full px-4 py-3 bg-white/10 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl outline-none font-bold"
                >
                  <option value="none">{t.recurrenceNone}</option>
                  <option value="daily">{t.recurrenceDaily}</option>
                  <option value="weekly">{t.recurrenceWeekly}</option>
                  <option value="monthly">{t.recurrenceMonthly}</option>
                  <option value="yearly">{t.recurrenceYearly}</option>
                </select>
                
                {recurrenceType !== 'none' && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl animate-fade-in">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 ml-2">{t.every}</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="365"
                      value={recurrenceInterval} 
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-white dark:bg-black/40 border border-indigo-200 dark:border-white/10 rounded-lg outline-none text-center font-bold text-sm" 
                    />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{getUnitLabel()}</span>
                  </div>
                )}
              </div>
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
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold flex items-center gap-2">
                <Box size={16} className="text-indigo-500" /> {t.addMoreFields}
              </label>
              <button type="button" onClick={addField} className="text-xs bg-indigo-50 dark:bg-white/5 text-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold">
                <Plus size={14} /> {lang === 'th' ? 'เพิ่มฟิลด์' : 'Add Field'}
              </button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-2 bg-black/5 dark:bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 transition-all hover:border-indigo-500/30">
                  <div className="flex-1 min-w-0">
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={(e) => updateField(field.id, { label: e.target.value })} 
                      placeholder={lang === 'th' ? 'ชื่อฟิลด์' : 'Field Name'}
                      className="w-full bg-transparent border-b border-zinc-300 dark:border-white/10 outline-none text-sm font-bold py-1 mb-2" 
                    />
                    <div className="flex gap-2 items-center">
                      <select 
                        value={field.type} 
                        onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                        className="text-[10px] bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-md px-2 py-1 outline-none font-bold"
                      >
                        <option value="text">{lang === 'th' ? 'ข้อความ' : 'Text'}</option>
                        <option value="number">{lang === 'th' ? 'ตัวเลข' : 'Number'}</option>
                        <option value="date">{lang === 'th' ? 'วันที่' : 'Date'}</option>
                        <option value="checkbox">{lang === 'th' ? 'ถูก/ผิด' : 'Checkbox'}</option>
                      </select>
                      
                      {field.type === 'checkbox' ? (
                        <input 
                          type="checkbox" 
                          checked={field.value as boolean} 
                          onChange={(e) => updateField(field.id, { value: e.target.checked })}
                          className="w-5 h-5 rounded-md accent-indigo-600"
                        />
                      ) : (
                        <input 
                          type={field.type === 'date' ? 'date' : 'text'} 
                          value={field.value as string} 
                          onChange={(e) => updateField(field.id, { value: e.target.value })} 
                          placeholder={lang === 'th' ? 'กรอกค่าที่นี่...' : 'Value...'}
                          className="flex-1 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none" 
                        />
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeField(field.id)} 
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors self-end md:self-center"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
      
      <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5 dark:bg-black/20">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400">{t.cancel}</button>
        <button type="submit" form="item-form" className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
          {t.save}
        </button>
      </div>
    </div>
  );
};

export default ItemForm;