'use client';

import { Sauna } from './Chat';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

export default function SaunaList({ saunas }: { saunas: Sauna[] }) {
  const t = useTranslations('List');
  const navT = useTranslations('Navigation');

  if (!saunas || saunas.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 text-gray-400">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Search size={36} className="text-emerald-500" />
        </div>
        <p className="font-medium text-lg">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 flex flex-col">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 text-white shadow-md z-10">
        <h2 className="font-bold text-lg">{navT('list')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {saunas.map((sauna, index) => (
          <div key={sauna.id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg text-gray-800 mb-2">{sauna.name}</h3>
            
            <div className="flex flex-col gap-1 text-sm text-gray-600 mb-3">
              {!!sauna.rating && (
                <div className="flex items-center">
                  <span>{t('rating')} {String(sauna.rating)}</span>
                </div>
              )}
              {!!sauna.water_temp && (
                <div className="flex items-center">
                  <span>{t('waterTemp')}{String(sauna.water_temp)}℃</span>
                </div>
              )}
            </div>

            {!!sauna.features && Array.isArray(sauna.features) && (
              <div className="flex flex-wrap gap-1.5">
                {sauna.features.map((f: string, i: number) => (
                  <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-md font-medium border border-emerald-100/50">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
