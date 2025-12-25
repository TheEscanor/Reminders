import React, { useState, useRef, useEffect } from 'react';
import { analyzeDataWithGemini } from '../services/geminiService.ts';
import { ReminderItem, ChatMessage } from '../types.ts';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface AIAssistantProps {
  items: ReminderItem[];
  userApiKey?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ items, userApiKey }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยเตือนความจำ มีอะไรให้ผมช่วยตรวจสอบไหมครับ? เช่น "ถึงเวลาเปลี่ยนน้ำมันเครื่องหรือยัง?" หรือ "เดือนนี้มีงานอะไรสำคัญบ้าง?"', timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: query, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    const responseText = await analyzeDataWithGemini(items, userMsg.text, userApiKey, messages);

    const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "สรุปงานเดือนนี้ให้หน่อย",
    "งานไหนที่เลยกำหนดแล้ว",
    "สัปดาห์หน้ามีอะไรต้องทำบ้าง",
    "สรุปค่าไฟและค่าน้ำเดือนล่าสุด"
  ];

  return (
    <div className="flex flex-col h-[650px] glass-panel bg-white/80 dark:bg-zinc-900/80 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden backdrop-blur-2xl">
      <div className="bg-white/5 dark:bg-black/10 border-b border-white/10 p-5 flex items-center gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-2xl shadow-glow">
            <Sparkles size={24} className="text-white" />
        </div>
        <div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">AI Assistant</h3>
            <p className="text-xs text-zinc-500 dark:text-white/50 font-medium">Personal Key Mode</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/5 dark:bg-black/20 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-white dark:bg-zinc-800'}`}>
                {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={20} className="text-indigo-600" />}
              </div>
              <div className={`p-4 rounded-3xl text-sm ${msg.role === 'user' ? 'bg-indigo-600/90 text-white rounded-tr-none' : 'bg-white/80 dark:bg-white/10 text-zinc-800 dark:text-white rounded-tl-none border border-white/10'}`}>
                 {msg.text.split('\n').map((line, i) => <p key={i} className="min-h-[1em]">{line}</p>)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white/80 dark:bg-white/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-3 text-zinc-500 dark:text-white/60 text-sm ml-14">
                <Loader2 size={16} className="animate-spin text-indigo-500" /> 
                <span>กำลังวิเคราะห์...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-white/10 dark:bg-black/20 border-t border-white/10">
        <div className="flex gap-2 mb-4 flex-wrap">
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => setQuery(s)} className="text-xs bg-white/20 dark:bg-white/5 hover:bg-indigo-500/20 text-zinc-700 dark:text-white/80 px-4 py-2 rounded-full border border-white/10">{s}</button>
            ))}
        </div>
        <div className="flex gap-3 items-end">
          <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ถาม AI..."
              className="flex-1 px-4 py-3 bg-white/10 dark:bg-white/5 border border-white/10 rounded-3xl text-sm outline-none"
              disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !query.trim()} className="bg-indigo-600 p-3 rounded-full text-white disabled:opacity-50"><Send size={20}/></button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;