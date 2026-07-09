'use client';

import { useSauna } from '../../context/SaunaContext';
import SaunaList from '../../components/SaunaList';
import BottomNav from '../../components/BottomNav';
import { Loader2 } from 'lucide-react';

export default function ListPage() {
  const { saunas, isLoading } = useSauna();

  return (
    <main className="min-h-screen w-full bg-slate-100 flex flex-col font-sans md:pl-20">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100 via-slate-100 to-emerald-50 opacity-70 z-0 pointer-events-none"></div>
      
      <div className="w-full h-full p-4 pb-24 md:p-8 flex-col z-10 relative flex-1 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[50vh]">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <SaunaList saunas={saunas} />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab="list" />
    </main>
  );
}
