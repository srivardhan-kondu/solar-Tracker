'use client';

import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  UserX,
  Plus,
  Lock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { User, UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  'Super Admin': 'Head office',
  Admin: 'Office staff',
  Installer: 'Installer',
  'Service Engineer': 'Service engineer',
};

export const UserManagementView: React.FC = () => {
  const { users, currentUser } = useApp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Everyone who uses Solar Tracker, and what kind of work they do.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Signed in as: <span className="font-bold text-slate-900">{currentUser.name} ({ROLE_LABEL[currentUser.role]})</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Division / Territory</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{u.username}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-800">{u.division}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{u.mobile}</td>
                  <td className="py-3 px-4 text-slate-400">{u.lastLogin}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-100 text-emerald-800">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
