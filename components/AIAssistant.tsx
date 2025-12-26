
import React, { useState, useRef, useEffect } from 'react';
import { analyzeDataWithGemini } from '../services/geminiService';
import { ReminderItem, ChatMessage } from '../types';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { translations, Lang } from '../i18n';

interface AIAssistantProps {
  items: ReminderItem[];
  lang: Lang;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ items, lang }) => {
  const t = translations[lang];
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: t.aiGreeting, timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: query, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]); setQuery(''); setIsLoading(true);
    // Gemini service now internally manages the API key from process.env.API_KEY
    const responseText = await analyzeDataWithGemini(items, userMsg.text, messages);
    setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[650px] glass-panel bg-white/80 dark:bg-zinc-900/80 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-2xl">
      <div className="bg-white/5 border-b border-white/10 p-5 flex items-center gap-4">
        <div className="bg-indigo-500 p-2.5 rounded-2xl shadow-glow"><Sparkles size={24} className="text-white" /></div>
        <h3 className="font-bold text-lg">{t.aiAssistant}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/5 dark:bg-black/20 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-white dark:bg-zinc-800'}`}>{msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={20} className="text-indigo-600" />}</div>
              <div className={`p-4 rounded-3xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/80 dark:bg-white/10 rounded-tl-none border border-white/10'}`}>{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start ml-14 gap-3 text-sm opacity-60"><Loader2 size={16} className="animate-spin text-indigo-500" /> {t.analyzing}</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-5 bg-white/10 border-t border-white/10 flex gap-3">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t.askAi} className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-3xl outline-none" disabled={isLoading} />
        <button onClick={handleSend} disabled={isLoading || !query.trim()} className="bg-indigo-600 p-3 rounded-full text-white disabled:opacity-50"><Send size={20}/></button>
      </div>
    </div>
  );
};

export default AIAssistant;
