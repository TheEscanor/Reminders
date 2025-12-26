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

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';
type Theme = 'light' | 'dark';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false); 
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [theme, setTheme] = useState<Theme>('light');
  
  const [view, setView] = useState<'dashboard' | 'list' | 'ai' | 'lifelog'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [showFullApiKey, setShowFullApiKey] = useState(false);

  // Initial Theme Setup
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const savedFontScale = localStorage.getItem('fontScale');
    if (savedFontScale) setFontScale(Number(savedFontScale));

    const savedUser = localStorage.getItem('ai_reminders_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const body = document.body;
    
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

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
        }
      } catch (error) {
        setSyncStatus('error');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [user?.username]);

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
      alert('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
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
    const newItems = editingItem ? items.map(i => i.id === item.id ? item : i) : [item, ...items];
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

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="min-h-screen flex font-sans overflow-hidden bg-transparent">
      {/* Mobile Top Nav */}
      <div className="md:hidden fixed top-0 w-full glass-panel z-30 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-xl">
               <Bell className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg">Smart Reminders</span>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-zinc-600 dark:text-zinc-300 rounded-full">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-600 dark:text-zinc-300 rounded-full">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
         </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-4 left-4 z-40 w-72 glass-panel rounded-[2rem] transform transition-transform md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} md:static md:block flex flex-col p-6 m-4 md:mr-0 md:h-[calc(100vh-2rem)]`}>
        <div className="mb-8">
            <div className="flex items-center gap-3 p-4 bg-zinc-100/50 dark:bg-white/5 rounded-3xl border border-zinc-200 dark:border-white/10">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><UserIcon size={24} /></div>
                <div className="flex-1 min-w-0"><p className="text-base font-bold truncate">{user.username}</p></div>
                <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition"><LogOut size={18} /></button>
            </div>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => {setView('dashboard'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'}`}><LayoutDashboard size={20}/><span>Dashboard</span></button>
          <button onClick={() => {setView('list'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition ${view === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'}`}><ListTodo size={20}/><span>My List</span></button>
          <button onClick={() => {setView('lifelog'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition ${view === 'lifelog' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'}`}><History size={20}/><span>Timeline</span></button>
          <button onClick={() => {setView('ai'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition ${view === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'}`}><MessageSquareText size={20}/><span>AI Assistant</span></button>
        </nav>
        <div className="pt-4 border-t border-zinc-200 dark:border-white/10">
           <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-2xl transition"><Settings size={18}/><span>Settings</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full overflow-y-auto h-screen custom-scrollbar">
        <div className="hidden md:flex justify-between items-center mb-10">
            <div>
                <h2 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {view === 'dashboard' ? 'Insight' : view === 'list' ? 'Reminders' : view === 'lifelog' ? 'Timeline' : 'Assistant'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Hello, {user.username}. Have a productive day!</p>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={toggleTheme} className="w-12 h-12 flex items-center justify-center rounded-2xl glass-panel hover:scale-105 active:scale-95 transition">
                    {theme === 'light' ? <Moon size={22} className="text-indigo-600" /> : <Sun size={22} className="text-amber-400" />}
                </button>
                <button onClick={() => {setEditingItem(null); setIsModalOpen(true)}} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-600/25 transition hover:scale-105 active:scale-95">
                    <Plus size={20} strokeWidth={3} /> Create New
                </button>
            </div>
        </div>

        <div className="animate-fade-in pb-20 md:pb-0">
            {loadingInitial ? (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="font-semibold text-zinc-500">Syncing with Cloud...</p>
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

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={() => {setEditingItem(null); setIsModalOpen(true)}}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modals */}
      {isModalOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl"><ItemForm initialItem={editingItem} onSave={handleSaveItem} onCancel={() => setIsModalOpen(false)} /></div></div>}
      
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="glass-panel rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-zinc-800 dark:text-white">
                <Settings size={24} className="text-indigo-600" /> Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition"><X size={24} /></button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-sm font-bold flex items-center gap-2 mb-4 text-zinc-600 dark:text-zinc-400">
                  <Type size={18} /> Font Size ({fontScale}%)
                </label>
                <input type="range" min="85" max="115" step="5" value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><Key size={18} /> API Key Status</label>
                  <button onClick={handleSyncProfile} disabled={isSyncingProfile} className="p-2 bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition"><RefreshCw size={16} className={isSyncingProfile ? 'animate-spin' : ''} /></button>
                </div>
                <div className="p-4 bg-zinc-100 dark:bg-black/40 rounded-2xl border border-zinc-200 dark:border-white/10 text-xs font-mono break-all text-zinc-600 dark:text-zinc-400">
                  {user?.apiKey ? (showFullApiKey ? user.apiKey : '••••••••••••••••••••••••') : 'No Key Configured'}
                </div>
                <button onClick={() => setShowFullApiKey(!showFullApiKey)} className="w-full mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 py-2">
                    {showFullApiKey ? 'Hide Key' : 'Show Key'}
                </button>
              </div>

              <button onClick={handleLogout} className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-bold transition hover:bg-red-100">Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;