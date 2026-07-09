'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import { Send, Bot, User, MapPin, Search, Globe } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../i18n/routing';

export interface Sauna {
  id?: string;
  name: string;
  location: { lat: number; lng: number };
  [key: string]: unknown;
}

export default function Chat({ onSaunasFound }: { onSaunasFound: (saunas: Sauna[]) => void }) {
  const [input, setInput] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  
  const t = useTranslations('Chat');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: deviceId ? { 'x-device-id': deviceId } : undefined
    }),
  });

  const isGenerating = status === 'submitted' || status === 'streaming';

  // Initialize device ID asynchronously to avoid React compiler warnings
  useEffect(() => {
    const initDevice = async () => {
      let id = localStorage.getItem('sauna-device-id');
      if (!id) {
        id = uuidv4();
        localStorage.setItem('sauna-device-id', id);
      }
      setDeviceId(id);
    };
    initDevice();
  }, []);

  // Extract saunas from tool invocations
  useEffect(() => {
    let foundSaunas: Sauna[] = [];
    messages.forEach((m: UIMessage) => {
      if (m.parts) {
        m.parts.forEach((part: Record<string, unknown>) => {
          if (part.type === 'tool-invocation' && typeof part.toolInvocation === 'object' && part.toolInvocation !== null) {
            const ti = part.toolInvocation as Record<string, unknown>;
            if (ti.state === 'result' && ti.toolName === 'searchSaunas') {
               const res = ti.result as { saunas?: Sauna[] };
               if (res && res.saunas) {
                 foundSaunas = res.saunas;
               }
            }
          }
        });
      }
    });
    if (foundSaunas && foundSaunas.length > 0) {
      onSaunasFound(foundSaunas);
    }
  }, [messages, onSaunasFound]);

  return (
    <div className="flex flex-col w-full h-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 text-white flex items-center gap-3 shadow-md z-10 relative">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Bot size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{t('title')}</h2>
          <p className="text-xs text-emerald-100 opacity-90">{t('subtitle')}</p>
        </div>
        
        {/* Language Toggle */}
        <button 
          onClick={() => router.replace(pathname, { locale: t('toggleTo') })}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
        >
          <Globe size={14} />
          <span>{t('toggleLang')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              <MapPin size={36} className="text-emerald-500" />
            </div>
            <p className="text-center font-medium whitespace-pre-wrap">
              {t('welcome')}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-sm">
              <button 
                onClick={() => setInput(t('suggestion1'))}
                className="bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 px-4 py-2 rounded-full text-sm transition-all"
              >
                {t('suggestion1')}
              </button>
              <button 
                onClick={() => setInput(t('suggestion2'))}
                className="bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 px-4 py-2 rounded-full text-sm transition-all"
              >
                {t('suggestion2')}
              </button>
              <button 
                onClick={() => setInput(t('suggestion3'))}
                className="bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 px-4 py-2 rounded-full text-sm transition-all"
              >
                {t('suggestion3')}
              </button>
            </div>
          </div>
        )}

        {messages.map((m: UIMessage) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'}`}>
                
                {/* Process all parts including text and tool invocations */}
                {m.parts?.map((part: Record<string, unknown>, index: number) => {
                  if (part.type === 'text') {
                     return (
                       <div key={index} className="whitespace-pre-wrap leading-relaxed text-sm">
                         {part.text as string}
                       </div>
                     );
                  }
                  if (part.type === 'tool-invocation') {
                     const ti = part.toolInvocation as Record<string, unknown>;
                     return (
                       <div key={index} className="mt-3 text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100/50 flex flex-col gap-2">
                         <div className="flex items-center gap-2 font-medium">
                           <Search size={14} className="animate-pulse" />
                           <span>{t('searching')}</span>
                         </div>
                         {ti.state === 'result' && (ti.result as { saunas?: Sauna[] })?.saunas && (
                           <div className="pl-5 text-emerald-600/80">
                             {t('foundSaunas', { count: ((ti.result as { saunas?: Sauna[] }).saunas || []).length })}
                           </div>
                         )}
                       </div>
                     );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}
        {error && (
          <div className="flex justify-center mb-4">
             <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200/60 shadow-sm max-w-sm text-center">
               {error.message || t('errorOccurred')}
             </div>
          </div>
        )}
        {status === 'submitted' && !error && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="flex gap-3 max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                 <Bot size={16} />
               </div>
               <div className="p-4 rounded-2xl bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-2">
                 <div className="flex space-x-1">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form 
          onSubmit={event => {
            event.preventDefault();
            if (!input.trim()) return;
            sendMessage({ text: input }, { body: { language: locale } });
            setInput('');
          }} 
          className="flex gap-2 relative"
        >
          <input
            className="w-full p-4 pr-12 border-2 border-gray-100 rounded-full shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all bg-gray-50 text-sm"
            value={input}
            placeholder={t('placeholder')}
            onChange={event => setInput(event.target.value)}
            disabled={isGenerating}
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:hover:bg-emerald-600 shadow-md"
            disabled={isGenerating || !input.trim()}
          >
            <Send size={16} className={input.trim() ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}
