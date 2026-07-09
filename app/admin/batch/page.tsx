'use client';

import { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function BatchProcessingPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const runBatch = async () => {
    setStatus('loading');
    setMessage('バッチ処理を実行中...');

    try {
      const response = await fetch('/api/admin/batch', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'バッチ処理が正常に完了しました。');
      } else {
        setStatus('error');
        setMessage(data.error || 'エラーが発生しました。');
      }
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'ネットワークエラーが発生しました。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-slate-800 p-6 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚙️ 管理者専用バッチ処理
          </h1>
          <p className="text-slate-300 text-sm mt-2">
            ※このページはローカル環境(localhost)からのみ実行可能です。
          </p>
        </div>

        <div className="p-6 flex flex-col items-center">
          <p className="text-gray-600 mb-6 text-center">
            データベース(Firestore)へのサウナ情報の初期登録・更新を一括で行います。
          </p>

          <button
            onClick={runBatch}
            disabled={status === 'loading'}
            className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              status === 'loading' 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {status === 'loading' ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Play size={20} />
            )}
            {status === 'loading' ? '実行中...' : 'バッチ処理を開始する'}
          </button>

          {status !== 'idle' && (
            <div className={`mt-6 w-full p-4 rounded-lg border flex items-start gap-3 ${
              status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              status === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {status === 'success' && <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={20} />}
              {status === 'error' && <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={20} />}
              {status === 'loading' && <Loader2 className="shrink-0 mt-0.5 animate-spin text-blue-600" size={20} />}
              
              <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                {message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
