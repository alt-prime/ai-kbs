'use client';

import { useState } from 'react';
import Chat, { Sauna } from '../components/Chat';
import MapComponent from '../components/Map';

export default function Home() {
  const [saunas, setSaunas] = useState<Sauna[]>([]);

  return (
    <main className="h-screen w-screen bg-slate-100 flex overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100 via-slate-100 to-emerald-50 opacity-70 z-0 pointer-events-none"></div>
      
      {/* Chat Section */}
      <div className="w-full md:w-2/5 h-full p-4 md:p-6 flex flex-col z-10 relative">
        <Chat onSaunasFound={(foundSaunas) => setSaunas(foundSaunas)} />
      </div>

      {/* Map Section */}
      <div className="hidden md:flex w-3/5 h-full p-6 pl-0 z-10 relative">
        <MapComponent saunas={saunas} />
      </div>

      {/* Mobile Map Overlay (Optional: can add a button to toggle map on mobile) */}
    </main>
  );
}