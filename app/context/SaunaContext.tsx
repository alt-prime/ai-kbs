'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Sauna } from '../components/Chat';

interface SaunaContextType {
  saunas: Sauna[];
  setSaunas: (saunas: Sauna[]) => void;
  isLoading: boolean;
}

const SaunaContext = createContext<SaunaContextType | undefined>(undefined);

export function SaunaProvider({ children }: { children: ReactNode }) {
  const [saunas, setSaunas] = useState<Sauna[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialSaunas();
  }, []);

  return (
    <SaunaContext.Provider value={{ saunas, setSaunas, isLoading }}>
      {children}
    </SaunaContext.Provider>
  );
}

export function useSauna() {
  const context = useContext(SaunaContext);
  if (context === undefined) {
    throw new Error('useSauna must be used within a SaunaProvider');
  }
  return context;
}
