'use client';

import { useSearchParams } from 'next/navigation';
import { useSauna } from '../context/SaunaContext';
import BottomNav from '../components/BottomNav';
import Chat from '../components/Chat';
import MapComponent from '../components/Map';

export default function Home() {
  const { saunas, setSaunas } = useSauna();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'ai';
  const activeTab = view === 'map' ? 'map' : 'ai';

  return (
    <main className="h-screen w-full bg-slate-100 flex flex-col md:flex-row overflow-hidden font-sans md:pl-20">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100 via-slate-100 to-emerald-50 opacity-70 z-0 pointer-events-none"></div>
      
      {/* List Section (Mobile Only) - Moved to /list page */}      {/* Chat Section */}
      <div className={`${activeTab === 'ai' ? 'flex' : 'hidden'} md:flex w-full md:w-2/5 h-full p-4 pb-24 md:p-6 md:pb-6 flex-col z-10 relative`}>
        <Chat onSaunasFound={(foundSaunas) => setSaunas(foundSaunas)} />
      </div>

      {/* Map Section */}
      <div className={`${activeTab === 'map' ? 'flex' : 'hidden'} md:flex w-full md:w-3/5 h-full p-4 pb-24 md:p-6 md:pl-0 md:pb-6 z-10 relative`}>
        <MapComponent saunas={saunas} />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} />
    </main>
  );
}