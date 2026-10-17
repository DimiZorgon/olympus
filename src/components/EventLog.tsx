'use client';

import React from 'react';

interface EventLogProps {
  logs: string[];
}

export const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm space-y-2">
      <div className="flex justify-between items-center border-b pb-1.5">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
          📜 Journal des Événements
        </h3>
        <span className="text-[10px] text-slate-400">{logs.length} messages</span>
      </div>

      <div className="max-h-44 overflow-y-auto space-y-1 text-xs text-slate-700 pr-1">
        {logs.map((log, index) => (
          <div
            key={index}
            className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-start gap-1.5"
          >
            <span className="text-slate-400 text-[10px]">•</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

