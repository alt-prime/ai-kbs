'use client';

import { useTranslations, useLocale } from 'next-intl';
import { List, Bot, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BottomNavProps {
  activeTab: 'list' | 'ai' | 'map';
  onTabChange?: (tab: 'list' | 'ai' | 'map') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const t = useTranslations('Navigation');
  const router = useRouter();
  const locale = useLocale();

  const handleTabClick = (tab: 'list' | 'ai' | 'map') => {
    if (onTabChange) {
      // 親コンポーネントで制御する場合（同じページ内でのタブ切り替えなど）
      onTabChange(tab);
    } else {
      // デフォルトのルーティング挙動
      if (tab === 'list') {
        router.push(`/${locale}/list`);
      } else if (tab === 'ai') {
        router.push(`/${locale}?view=ai`);
      } else if (tab === 'map') {
        router.push(`/${locale}?view=map`);
      }
    }
  };

  return (
    <div className="
      fixed z-50 bg-white/90 backdrop-blur-md border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.05)]
      bottom-0 left-0 w-full border-t flex flex-row justify-around items-center p-2 pb-safe
      md:top-0 md:left-0 md:h-screen md:w-20 md:flex-col md:border-t-0 md:border-r md:justify-start md:pt-12 md:space-y-8
    ">
      <button 
        onClick={() => handleTabClick('list')}
        className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'list' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <List size={24} className={activeTab === 'list' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
        <span className="text-[10px] font-medium">{t('list')}</span>
      </button>
      <button 
        onClick={() => handleTabClick('ai')}
        className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'ai' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Bot size={24} className={activeTab === 'ai' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
        <span className="text-[10px] font-medium">{t('ai')}</span>
      </button>
      <button 
        onClick={() => handleTabClick('map')}
        className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === 'map' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <MapIcon size={24} className={activeTab === 'map' ? 'mb-1 stroke-[2.5px]' : 'mb-1'} />
        <span className="text-[10px] font-medium">{t('map')}</span>
      </button>
    </div>
  );
}
