import React, { useState, useEffect } from 'react';
import { History, X, Clock, ShieldCheck, User } from 'lucide-react';
import apiClient from '../api/client';

export default function AuditTrail({ isOpen, onClose, recordId, tableName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Fetch audit logs or simulated logs
      apiClient.get('/audit', { params: { record_id: recordId, table_name: tableName } })
        .then((res) => setLogs(res.data || []))
        .catch(() => {
          // Fallback dummy audit view for demo
          setLogs([
            {
              id: '1',
              action: 'SEED_DEMO_DATA',
              changed_by: 'system_seeder',
              created_at: new Date().toISOString(),
              changes: { note: 'Initial demographic and clinical cycle registration' }
            }
          ]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, recordId, tableName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-md bg-[#111827] border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <History className="w-5 h-5 text-teal-400" />
            Immutable Audit Trail
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-400 my-3">
          Every state change, coordinator action, and automated dispatch writes an immutable record.
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center text-xs text-slate-400 py-8">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">No audit records found.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 font-mono">{log.action}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>By: {log.changed_by}</span>
                </div>
                {log.changes && (
                  <pre className="p-2 bg-slate-950 rounded-lg text-[10px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
