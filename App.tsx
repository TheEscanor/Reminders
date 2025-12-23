import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, MessageSquareText, Plus, Bell, Cloud, Loader2, Check, WifiOff, History, Trash2, X, Moon, Sun, Menu, BellRing, LogOut, User as UserIcon, Settings, Type, Key, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ReminderList from './components/ReminderList';
import ItemForm from './components/ItemForm';
import AIAssistant from './components/AIAssistant';
import LifeLog from './components/LifeLog';
import Login from './components/Login';
import { ReminderItem, User } from './types';
import { generateSmartSummary } from './services/geminiService';
import { fetchItemsFromSheet, saveItemsToSheet, fetchUserProfile } from './services/sheetService';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_DATA: ReminderItem[] = [];

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';
type Theme = 'light' | 'dark';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ReminderItem[]>(INITIAL_DATA);
  const [loadingInitial, setLoadingInitial] = useState(false); 
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [theme, setTheme] = useState<Theme>('light');
  
  const [view, setView] = useState<'dashboard' | 'list' | 'ai' | 'lifelog'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [showFullApiKey, setShowFullApiKey] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    const savedFontScale = localStorage.getItem('fontScale');
    if (savedFontScale) setFontScale(Number(savedFontScale));

    const savedUser = localStorage.getItem('ai_reminders_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem('fontScale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!user) {
        setItems([]);
        return;
    }
    const loadData = async () => {
      setLoadingInitial(true);
      const localKey = `ai-reminders-data-${user.username}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) setItems(parsed);
        } catch (e) {}
      }
      try {
        const cloudData = await fetchItemsFromSheet(user.username);
        if (cloudData && Array.isArray(cloudData)) {
            setItems(cloudData);
            localStorage.setItem(localKey, JSON.stringify(cloudData));
            setSyncStatus('idle');
        }
      } catch (error) {
        setSyncStatus('error');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [user?.username]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('ai_reminders_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setItems([]);
    setAiSummary(null);
    localStorage.removeItem('ai_reminders_user');
  };

  const handleSyncProfile = async () => {
    if (!user) return;
    setIsSyncingProfile(true);
    const profile = await fetchUserProfile(user.username);
    if (profile) {
      const updatedUser = { ...user, apiKey: profile.apiKey };
      setUser(updatedUser);
      localStorage.setItem('ai_reminders_user', JSON.stringify(updatedUser));
      alert('อัปเดต API Key จาก Google Sheet สำเร็จแล้ว!');
    } else {
      alert('ไม่สามารถดึงข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    }
    setIsSyncingProfile(false);
  };

  const updateItems = async (newItems: ReminderItem[]) => {
    setItems(newItems);
    if (user) {
        localStorage.setItem(`ai-reminders-data-${user.username}`, JSON.stringify(newItems));
        setSyncStatus('syncing');
        const success = await saveItemsToSheet(newItems, user.username);
        if (success) {
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } else {
          setSyncStatus('error');
        }
    }
  };

  const handleSaveItem = (item: ReminderItem) => {
    const newItems = editingItem ? items.map(i => i.id === item.id ? item : i) : [...items, item];
    setIsModalOpen(false);
    setEditingItem(null);
    updateItems(newItems);
  };

  const handleDuplicateItem = (item: ReminderItem) => {
    const newItem: ReminderItem = {
      ...item,
      id: uuidv4(),
      title: `${item.title} (Copy)`,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: item.fields.map(f => ({ ...f, id: uuidv4() }))
    };
    updateItems([newItem, ...items]);
  };
  
  const handleToggleComplete = (id: string, currentStatus: boolean) => {
    let newItems = [...items];
    const idx = newItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const item = newItems[idx];
    newItems[idx] = { ...item, isCompleted: !currentStatus, updatedAt: new Date().toISOString() };
    updateItems(newItems);
  };

  const handleRefreshSummary = async () => {
      if (!user) return;
      setLoadingSummary(true);
      const summary = await generateSmartSummary(items, user.apiKey);
      setAiSummary(summary);
      setLoadingSummary(false);
  };

  const handleCopyApiKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      alert('คัดลอก API Key เรียบร้อยแล้ว');
    }
  };

  const maskApiKey = (key: string | undefined) => {
    if (!key || key.trim() === "") return 'ไม่พบ API Key';
    if (key.length <= 16) return key;
    return `${key.substring(0, 16)}${'*'.repeat(Math.max(0, key.length - 16))}`;
  };

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="min-h-screen flex font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <div className="md:hidden fixed top-0 w-full glass-panel z-30 px-4 py-3 flex justify-between items-center border-b border-white/10">
         <div className="flex items-center gap-2">
            <div className="bg-indigo-500/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg">
               <Bell className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg text-zinc-800 dark:text-white">Smart Reminders</span>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-zinc-600 dark:text-zinc-300 rounded-full"><Settings size={20} /></button>
            <button onClick={toggleTheme} className="p-2 text-zinc-600 dark:text-zinc-300 rounded-full">{theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}</button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-600 dark:text-zinc-300 rounded-full">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
         </div>
      </div>

      <aside className={`fixed inset-y-4 left-4 z-40 w-72 glass-panel rounded-[2rem] transform transition-transform md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} md:static md:block flex flex-col p-6 m-4 md:mr-0 md:h-[calc(100vh-2rem)]`}>
        <div className="mb-8 px-2">
            <div className="flex items-center gap-3 p-4 bg-white/10 dark:bg-black/20 rounded-3xl border border-white/10 shadow-lg">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white"><UserIcon size={24} /></div>
                <div className="flex-1 min-w-0"><p className="text-base font-bold truncate text-zinc-800 dark:text-white">{user.username}</p></div>
                <button onClick={handleLogout} className="p-2.5 text-zinc-400 hover:text-red-400 rounded-xl"><LogOut size={20} /></button>
            </div>
        </div>
        <nav className="space-y-3 flex-1">
          <button onClick={() => {setView('dashboard'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl ${view === 'dashboard' ? 'bg-white/20 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}><LayoutDashboard size={22}/><span>Dashboard</span></button>
          <button onClick={() => {setView('list'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl ${view === 'list' ? 'bg-white/20 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}><ListTodo size={22}/><span>My List</span></button>
          <button onClick={() => {setView('lifelog'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl ${view === 'lifelog' ? 'bg-white/20 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}><History size={22}/><span>Timeline</span></button>
          <button onClick={() => {setView('ai'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl ${view === 'ai' ? 'bg-white/20 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}><MessageSquareText size={22}/><span>AI Assistant</span></button>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-6 pt-20 md:pt-4 max-w-7xl mx-auto w-full overflow-y-auto h-screen custom-scrollbar">
        <div className="hidden md:flex justify-between items-center mb-6">
            <div><h2 className="text-4xl font-bold text-zinc-800 dark:text-white">{view === 'dashboard' ? 'Dashboard' : view === 'list' ? 'Reminders' : view === 'lifelog' ? 'Timeline' : 'Assistant'}</h2></div>
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-full glass-panel transition hover:scale-105 active:scale-95"><Settings size={22} /></button>
                <button onClick={toggleTheme} className="w-12 h-12 flex items-center justify-center rounded-full glass-panel transition hover:scale-105 active:scale-95">{theme === 'light' ? <Sun size={22} /> : <Moon size={22} />}</button>
                <button onClick={() => {setEditingItem(null); setIsModalOpen(true)}} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-xl transition hover:scale-105 active:scale-95"><Plus size={20} />New Item</button>
            </div>
        </div>

        <div className="animate-fade-in pb-20 md:pb-0">
            {loadingInitial ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-500">
                    <Loader2 className="animate-spin" size={48} />
                    <p className="font-medium">กำลังโหลดข้อมูลจาก Google Sheet...</p>
                </div>
            ) : (
                <>
                    {view === 'dashboard' && <Dashboard items={items} aiSummary={aiSummary} loadingSummary={loadingSummary} onRefreshSummary={handleRefreshSummary} />}
                    {view === 'list' && <ReminderList items={items} onEdit={item => {setEditingItem(item); setIsModalOpen(true)}} onDelete={(id) => updateItems(items.filter(i => i.id !== id))} onToggleComplete={handleToggleComplete} onDuplicate={handleDuplicateItem} onSnooze={() => {}} />}
                    {view === 'lifelog' && <LifeLog items={items} />}
                    {view === 'ai' && <div className="max-w-4xl mx-auto"><AIAssistant items={items} userApiKey={user.apiKey} /></div>}
                </>
            )}
        </div>
      </main>

      {isModalOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl"><ItemForm initialItem={editingItem} onSave={handleSaveItem} onCancel={() => setIsModalOpen(false)} /></div></div>}
      
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="glass-panel bg-white/95 dark:bg-zinc-900/95 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-zinc-800 dark:text-white">
                <Settings size={24} className="text-indigo-500" /> การตั้งค่า
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-sm font-bold flex items-center gap-2 mb-4 text-zinc-700 dark:text-zinc-300">
                  <Type size={18} className="text-indigo-400" /> ขนาดตัวอักษร ({fontScale}%)
                </label>
                <input 
                  type="range" 
                  min="85" 
                  max="115" 
                  step="5" 
                  value={fontScale} 
                  onChange={(e) => setFontScale(Number(e.target.value))} 
                  className="w-full h-2 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <Key size={18} className="text-indigo-400" /> AI API Key
                  </label>
                  <button 
                    onClick={handleSyncProfile}
                    disabled={isSyncingProfile}
                    title="Sync กับ Google Sheet"
                    className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isSyncingProfile ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="w-full px-4 py-3 text-xs bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-600 dark:text-white/70 font-mono break-all min-h-[44px] flex items-center">
                      {showFullApiKey ? (user?.apiKey || 'ไม่พบ API Key') : maskApiKey(user?.apiKey)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowFullApiKey(!showFullApiKey)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-200 dark:bg-white/5 hover:bg-zinc-300 dark:hover:bg-white/10 text-zinc-700 dark:text-white rounded-xl text-xs font-bold transition"
                    >
                      {showFullApiKey ? <><EyeOff size={14} /> ปิดบัง</> : <><Eye size={14} /> แสดง</>}
                    </button>
                    <button 
                      onClick={handleCopyApiKey}
                      disabled={!user?.apiKey || user.apiKey.trim() === ""}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-400 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
                    >
                      <Copy size={14} /> คัดลอก
                    </button>
                  </div>
                </div>
                
                <p className="text-[10px] text-zinc-400 dark:text-white/30 mt-3 leading-relaxed italic">
                  * หากเติม Key ใน Sheet แล้วไม่ขึ้น ให้กดปุ่มลูกศรหมุนด้านบนเพื่อ Sync
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {setFontScale(100); setIsSettingsOpen(false)}} 
                  className="w-full py-4 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-white rounded-2xl font-bold transition"
                >
                  รีเซ็ตขนาดตัวอักษร
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;