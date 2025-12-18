import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, MessageSquareText, Plus, Bell, Cloud, Loader2, Check, WifiOff, History, Trash2, X, Moon, Sun, Menu, BellRing, LogOut, User as UserIcon, Settings, Type } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ReminderList from './components/ReminderList';
import ItemForm from './components/ItemForm';
import AIAssistant from './components/AIAssistant';
import LifeLog from './components/LifeLog';
import Login from './components/Login';
import { ReminderItem, User } from './types';
import { generateSmartSummary } from './services/geminiService';
import { fetchItemsFromSheet, saveItemsToSheet } from './services/sheetService';
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
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  // Settings & Font State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(100);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    // Font Scale Initialization
    const savedFontScale = localStorage.getItem('fontScale');
    if (savedFontScale) {
        setFontScale(Number(savedFontScale));
    }

    // Auth check
    const savedUser = localStorage.getItem('ai_reminders_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }

    // Request Notification Permission on load
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Apply Font Scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem('fontScale', String(fontScale));
  }, [fontScale]);

  // Fetch data only when user is logged in
  useEffect(() => {
    if (!user) {
        setItems([]); // CRITICAL: Clear items immediately if no user
        return;
    }

    // CRITICAL: Reset items to empty or local cache before fetching to avoid showing previous user's data
    setItems([]); 

    const loadData = async () => {
      setLoadingInitial(true);
      
      const localKey = `ai-reminders-data-${user.username}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) setItems(parsed);
        } catch (e) { console.error("Failed to parse local data", e); }
      }

      try {
        const cloudData = await fetchItemsFromSheet(user.username);
        // Double check filtering (Defense in depth)
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
  }, [user]);

  // Check for due items and notify
  useEffect(() => {
    if (loadingInitial || items.length === 0 || notificationPermission !== 'granted' || !user) return;

    const checkDueItems = () => {
      const today = new Date().setHours(0,0,0,0);
      const dueItems = items.filter(item => {
        if (!item.dueDate || item.isCompleted) return false;
        const due = new Date(item.dueDate).setHours(0,0,0,0);
        return due === today;
      });

      if (dueItems.length > 0) {
        const notifiedKey = `notified-${new Date().toISOString().split('T')[0]}-${user.username}`;
        if (!sessionStorage.getItem(notifiedKey)) {
             new Notification("AI Smart Reminders", {
                body: `คุณมี ${dueItems.length} รายการที่ครบกำหนดวันนี้! (เช่น ${dueItems[0].title})`,
                icon: '/vite.svg' 
             });
             sessionStorage.setItem(notifiedKey, 'true');
        }
      }
    };

    checkDueItems();
    const interval = setInterval(checkDueItems, 3600000); 
    return () => clearInterval(interval);
  }, [items, loadingInitial, notificationPermission, user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLoginSuccess = (username: string) => {
    const newUser = { username, isAuthenticated: true };
    setUser(newUser);
    localStorage.setItem('ai_reminders_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setItems([]); // Clear UI immediately
    setAiSummary(null);
    localStorage.removeItem('ai_reminders_user');
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
    let newItems;
    if (editingItem) {
      newItems = items.map(i => i.id === item.id ? item : i);
    } else {
      newItems = [...items, item];
    }
    setIsModalOpen(false);
    setEditingItem(null);
    updateItems(newItems);
  };

  const confirmDeleteItem = (id: string) => setItemToDelete(id);

  const executeDelete = () => {
    if (itemToDelete) {
        const newItems = items.filter(i => String(i.id) !== String(itemToDelete));
        updateItems(newItems);
        setItemToDelete(null);
    }
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
    const newItems = [newItem, ...items];
    updateItems(newItems);
  };
  
  const handleSnooze = (id: string, type: 'tomorrow' | 'nextWeek') => {
    const newItems = items.map(item => {
      if (item.id !== id) return item;
      
      const baseDate = new Date(); 
      if (type === 'tomorrow') {
         baseDate.setDate(baseDate.getDate() + 1);
      } else {
         baseDate.setDate(baseDate.getDate() + 7);
      }
      
      return {
        ...item,
        dueDate: baseDate.toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
    });
    updateItems(newItems);
  };

  const calculateNextDueDate = (currentDate: string, recurrence: string): string => {
      const date = new Date(currentDate);

      // Handle "monthly_X" format
      if (recurrence && recurrence.startsWith('monthly_')) {
         const monthsToAdd = parseInt(recurrence.split('_')[1], 10);
         if (!isNaN(monthsToAdd)) {
             date.setMonth(date.getMonth() + monthsToAdd);
         }
         return date.toISOString().split('T')[0];
      }

      switch(recurrence) {
          case 'daily': date.setDate(date.getDate() + 1); break;
          case 'weekly': date.setDate(date.getDate() + 7); break;
          case 'monthly': date.setMonth(date.getMonth() + 1); break;
          case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
          default: return currentDate;
      }
      return date.toISOString().split('T')[0];
  };

  const handleToggleComplete = (id: string, currentStatus: boolean) => {
    let newItems = [...items];
    const targetItemIndex = newItems.findIndex(i => i.id === id);
    
    if (targetItemIndex === -1) return;
    
    const item = newItems[targetItemIndex];
    
    const updatedItem = { 
        ...item, 
        isCompleted: !currentStatus, 
        updatedAt: new Date().toISOString() 
    };
    newItems[targetItemIndex] = updatedItem;

    if (!currentStatus && item.recurrence && item.recurrence !== 'none' && item.dueDate) {
        const nextDueDate = calculateNextDueDate(item.dueDate, item.recurrence);
        
        let nextFields = item.fields.map(f => ({ ...f, id: uuidv4() }));

        const paymentField = nextFields.find(f => 
            f.type === 'number' && 
            (f.label.includes('จ่ายเดือนละ') || f.label.includes('ยอดชำระ') || f.label.includes('ค่างวด'))
        );
        
        const balanceField = nextFields.find(f => 
            f.type === 'number' && 
            (f.label.includes('ยอดคงเหลือ') || f.label.includes('หนี้คงเหลือ') || f.label.includes('Balance'))
        );

        if (paymentField && balanceField) {
            const payment = Number(paymentField.value) || 0;
            const currentBalance = Number(balanceField.value) || 0;
            const newBalance = Math.max(0, currentBalance - payment);
            balanceField.value = newBalance;
        }
        
        const nextItem: ReminderItem = {
            ...item,
            id: uuidv4(),
            title: item.title,
            dueDate: nextDueDate,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fields: nextFields
        };
        
        newItems = [nextItem, ...newItems];
    }

    updateItems(newItems);
  };

  const openEdit = (item: ReminderItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleRefreshSummary = async () => {
      setLoadingSummary(true);
      const summary = await generateSmartSummary(items);
      setAiSummary(summary);
      setLoadingSummary(false);
  };

  const NavButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => {
        setView(id);
        setIsMobileMenuOpen(false);
      }}
      className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 overflow-hidden ${
        view === id 
          ? 'bg-white/20 dark:bg-white/10 text-white shadow-glass backdrop-blur-md border border-white/20' 
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/10 hover:text-indigo-600 dark:hover:text-white hover:backdrop-blur-sm'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${view === id ? 'opacity-100' : ''}`} />
      <Icon size={22} className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${view === id ? 'text-white' : ''}`} />
      <span className="font-semibold text-sm relative z-10">{label}</span>
      {view === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>}
    </button>
  );

  // --- RENDER LOGIC ---

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (loadingInitial && items.length === 0) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white/80 gap-4">
            <Loader2 size={48} className="animate-spin text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            <p className="font-medium tracking-wide animate-pulse">กำลังโหลดข้อมูลของ {user.username}...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden">
      
      {/* Mobile Header (Glass) */}
      <div className="md:hidden fixed top-0 w-full glass-panel z-30 px-4 py-3 flex justify-between items-center border-b border-white/10">
         <div className="flex items-center gap-2">
            <div className="bg-indigo-500/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg shadow-indigo-500/20">
               <Bell className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg text-zinc-800 dark:text-white">Smart Reminders</span>
         </div>
         <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-white/10 rounded-full transition backdrop-blur-sm"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={toggleTheme}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-white/10 rounded-full transition backdrop-blur-sm"
            >
                {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-600 dark:text-zinc-300 backdrop-blur-sm hover:bg-white/10 rounded-full transition">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
         </div>
      </div>

      {/* Floating Sidebar (Glass) */}
      <aside className={`fixed inset-y-4 left-4 z-40 w-72 glass-panel rounded-[2rem] transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} md:static md:block flex flex-col p-6 m-4 md:mr-0 border-r-0 md:h-[calc(100vh-2rem)]`}>
        
        {/* User Profile Header (Replaces previous App Title) */}
        <div className="mb-8 px-2">
            <div className="flex items-center gap-3 p-4 bg-white/10 dark:bg-black/20 rounded-3xl border border-white/10 shadow-lg backdrop-blur-md">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-glow">
                    <UserIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate text-zinc-800 dark:text-white">{user.username}</p>
                    <div className="flex items-center gap-1.5">
                         <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </span>
                        <p className="text-[10px] text-zinc-500 dark:text-white/50 font-medium uppercase tracking-wider">Online</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout} 
                    className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-white/10 transition rounded-xl" 
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        <nav className="space-y-3 flex-1">
          <p className="px-4 text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mb-2">Menu</p>
          <NavButton id="dashboard" label="Control Center" icon={LayoutDashboard} />
          <NavButton id="list" label="My List" icon={ListTodo} />
          <NavButton id="lifelog" label="Timeline" icon={History} />
          <NavButton id="ai" label="AI Assistant" icon={MessageSquareText} />
        </nav>

        <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between px-4 py-3 text-xs font-medium text-zinc-500 dark:text-white/60 bg-black/5 dark:bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm">
               <span className="flex items-center gap-2">
                 {syncStatus === 'idle' ? <Cloud size={14} className="text-blue-500" /> : syncStatus === 'syncing' ? <Loader2 size={14} className="animate-spin text-white" /> : syncStatus === 'saved' ? <Check size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
                 {syncStatus === 'idle' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'saved' ? 'Saved' : 'Offline'}
               </span>
               <span className="opacity-50">v2.3</span>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pt-20 md:pt-4 max-w-7xl mx-auto w-full overflow-y-auto h-screen custom-scrollbar">
        
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-6 px-2">
            <div>
               <h2 className="text-4xl font-bold text-zinc-800 dark:text-white drop-shadow-md tracking-tight">
                   {view === 'dashboard' && 'Dashboard'}
                   {view === 'list' && 'Reminders'}
                   {view === 'lifelog' && 'Timeline'}
                   {view === 'ai' && 'Assistant'}
               </h2>
               <p className="text-zinc-600 dark:text-white/60 mt-1 font-medium">จัดการชีวิตของคุณให้ง่ายขึ้นด้วย AI</p>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* Notification Permission Button */}
                 {notificationPermission !== 'granted' && (
                    <button 
                       onClick={() => Notification.requestPermission().then(setNotificationPermission)}
                       className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-zinc-600 dark:text-white transition"
                       title="เปิดการแจ้งเตือน"
                    >
                        <BellRing size={20} />
                    </button>
                 )}

                {/* Settings Button */}
                <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="w-12 h-12 flex items-center justify-center rounded-full glass-panel text-zinc-600 dark:text-white/80 hover:bg-white/20 hover:scale-110 transition-all duration-300"
                   title="การตั้งค่า"
                >
                   <Settings size={22} />
                </button>

                <button 
                   onClick={toggleTheme}
                   className="w-12 h-12 flex items-center justify-center rounded-full glass-panel text-zinc-600 dark:text-white/80 hover:bg-white/20 hover:scale-110 transition-all duration-300"
                >
                   {theme === 'light' ? <Sun size={22} /> : <Moon size={22} />}
                </button>
                <button 
                    onClick={openNew}
                    className="group flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 font-bold"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Item
                </button>
            </div>
        </div>

        {/* Mobile FAB */}
        <button 
            onClick={openNew}
            className="md:hidden fixed bottom-6 right-6 z-30 bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-110 transition-transform"
        >
            <Plus size={24} />
        </button>

        {/* Views Container */}
        <div className="animate-fade-in pb-20 md:pb-0">
            {view === 'dashboard' && (
                <Dashboard 
                    items={items} 
                    aiSummary={aiSummary} 
                    loadingSummary={loadingSummary}
                    onRefreshSummary={handleRefreshSummary}
                />
            )}
            {view === 'list' && (
                <ReminderList 
                    items={items} 
                    onEdit={openEdit} 
                    onDelete={confirmDeleteItem} 
                    onToggleComplete={handleToggleComplete}
                    onDuplicate={handleDuplicateItem}
                    onSnooze={handleSnooze}
                />
            )}
            {view === 'lifelog' && (
                <LifeLog items={items} />
            )}
            {view === 'ai' && (
                <div className="max-w-4xl mx-auto">
                     <AIAssistant items={items} />
                </div>
            )}
        </div>
      </main>

      {/* Glass Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl animate-scale-in">
            <ItemForm 
                initialItem={editingItem} 
                onSave={handleSaveItem} 
                onCancel={() => setIsModalOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Settings Modal (Small Glass) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
            <div className="glass-panel bg-white/90 dark:bg-zinc-900/95 rounded-[2rem] w-full max-w-sm animate-scale-in border border-white/20 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-800 dark:text-white">
                        <Settings size={20} className="text-indigo-500" /> การตั้งค่า (Settings)
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Font Size Control */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-zinc-600 dark:text-white/80 flex items-center gap-2">
                                <Type size={16} /> ขนาดตัวอักษร
                            </label>
                            <span className="text-xs bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-lg font-bold">{fontScale}%</span>
                        </div>
                        <div className="bg-zinc-100 dark:bg-black/30 p-4 rounded-xl border border-zinc-200 dark:border-white/5">
                            <input 
                                type="range" 
                                min="85" 
                                max="115" 
                                step="5" 
                                value={fontScale} 
                                onChange={(e) => setFontScale(Number(e.target.value))}
                                className="w-full accent-indigo-500 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between mt-2 text-xs text-zinc-400 font-medium">
                                <span>เล็ก</span>
                                <span>ปกติ (100%)</span>
                                <span>ใหญ่</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-200 dark:border-white/10">
                        <button 
                            onClick={() => {
                                setFontScale(100);
                                setIsSettingsOpen(false);
                            }}
                            className="w-full py-3 bg-zinc-200 dark:bg-white/5 hover:bg-zinc-300 dark:hover:bg-white/10 text-zinc-600 dark:text-white rounded-xl font-bold transition text-sm"
                        >
                            รีเซ็ตเป็นค่าเริ่มต้น
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Glass) */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
           <div className="glass-panel bg-zinc-900/90 rounded-[2.5rem] p-8 w-full max-w-sm animate-scale-in border border-white/10 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-6">
                 <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <Trash2 size={36} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-white">ยืนยันการลบ?</h3>
                    <p className="text-white/60 mt-2 leading-relaxed">
                       รายการนี้จะถูกลบออกจากระบบถาวรและไม่สามารถกู้คืนได้
                    </p>
                 </div>
                 <div className="flex gap-3 w-full mt-4">
                    <button 
                       onClick={() => setItemToDelete(null)}
                       className="flex-1 px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition backdrop-blur-md"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={executeDelete}
                       className="flex-1 px-4 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/40 transition"
                    >
                       Delete
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
            from { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

export default App;