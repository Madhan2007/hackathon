import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import { authApi } from '../api/client';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  Activity,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authApi.listUsers();
      setUsersList(res);
    } catch (err) {
      console.error('Failed to load clinic staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      await authApi.updateUserRole(userId, { role: newRole });
      setMessage({ type: 'success', text: `Role updated to ${newRole.toUpperCase()} successfully.` });
      await fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update user role.' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.role?.toLowerCase() === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-purple-400" />
            Clinic Staff & Role Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage clinic personnel authorizations, clinical permissions, and Supabase user profiles.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Role Counts Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['admin', 'doctor', 'coordinator', 'nurse'].map((roleKey) => {
          const cfg = ROLE_CONFIG[roleKey];
          const count = usersList.filter((u) => u.role?.toLowerCase() === roleKey).length;
          return (
            <div
              key={roleKey}
              onClick={() => setSelectedRoleFilter(selectedRoleFilter === roleKey ? 'all' : roleKey)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedRoleFilter === roleKey
                  ? 'bg-slate-800 border-teal-500 ring-2 ring-teal-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase">{cfg.shortLabel}</span>
                <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
              </div>
              <div className="text-2xl font-black text-white">{count}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{cfg.description.split('•')[0]}</div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0d1424]/80 border border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by staff name, email, or department..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Filter:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="doctor">Doctors / Specialists</option>
            <option value="coordinator">Coordinators</option>
            <option value="nurse">Nurses</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0d1424]/80 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Current Role</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Permissions Scope</th>
                <th className="py-3.5 px-4 text-right">Modify Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-teal-400" />
                    Loading clinical personnel...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleKey = u.role?.toLowerCase() || 'coordinator';
                  const cfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.coordinator;
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-tr ${cfg.avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-sm`}
                          >
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {u.full_name}
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {u.department || 'Reproductive Medicine'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-400 max-w-xs truncate">
                          {cfg.description}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <select
                          disabled={updatingId === u.id}
                          value={roleKey}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="admin">Administrator</option>
                          <option value="doctor">Doctor</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="nurse">Nurse</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
