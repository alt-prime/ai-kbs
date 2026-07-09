'use client';

import { useState, useEffect } from 'react';
import Chat, { Sauna } from '../components/Chat';
import MapComponent from '../components/Map';
import SaunaList from '../components/SaunaList';
import { useTranslations } from 'next-intl';
import { List, Bot, Map as MapIcon } from 'lucide-react';

export default function Home() {
  const [saunas, setSaunas] = useState<Sauna[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'ai' | 'map'>('ai');
  const t = useTranslations('Navigation');

  // 初期データ取得APIからデータを取得
  useEffect(() => {
    const fetchInitialSaunas = async () => {
      try {
        const response = await fetch('/api/saunas');
        const data = await response.json();
        if (data.saunas) {
          setSaunas(data.saunas);
        }
      } catch (error) {
        console.error('Failed to fetch initial saunas:', error);
      }
    };
    
    fetchInitialSaunas();
  }, []);

  return (
    <main className="h-screen w-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100 via-slate-100 to-emerald-50 opacity-70 z-0 pointer-events-none"></div>
      
      {/* List Section (Mobile Only) */}
      <div className={`${activeTab === 'list' ? 'flex' : 'hidden'} md:hidden w-full h-full p-4 pb-24 flex-col z-10 relative`}>
        <SaunaList saunas={saunas} />
      </div>

      {/* Chat Section */}
      <div className={`${activeTab === 'ai' ? 'flex' : 'hidden'} md:flex w-full md:w-2/5 h-full p-4 pb-24 md:p-6 md:pb-6 flex-col z-10 relative`}>
        <Chat onSaunasFound={(foundSaunas) => setSaunas(foundSaunas)} />
      </div>

      {/* Map Section */}
      <div className={`${activeTab === 'map' ? 'flex' : 'hidden'} md:flex w-full md:w-3/5 h-full p-4 pb-24 md:p-6 md:pl-0 md:pb-6 z-10 relative`}>
        <MapComponent saunas={saunas} />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'list' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <List size={24} className={activeTab === 'list' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
          <span className="text-[10px] font-medium">{t('list')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'ai' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Bot size={24} className={activeTab === 'ai' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
          <span className="text-[10px] font-medium">{t('ai')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'map' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <MapIcon size={24} className={activeTab === 'map' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
          <span className="text-[10px] font-medium">{t('map')}</span>
        </button>
      </div>
    </main>
  );
}