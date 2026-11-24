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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Everyone who uses Solar Tracker, and what kind of work they do.
          </p>
        </div>

        <div className="text-sm font-semibold text-slate-600">
          Signed in as: <span className="font-bold text-slate-900">{currentUser.name} ({ROLE_LABEL[currentUser.role]})</span>
        </div>
      </div>

      {/* People, as cards on every screen size */}
      <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {users.map((u) => (
          <li key={u.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-slate-900">{u.name}</div>
                <div className="text-sm text-slate-600">{ROLE_LABEL[u.role]}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-sm ${
                  u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {u.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-1 text-sm">
              <div><dt className="inline text-slate-500">Division: </dt><dd className="inline text-slate-900">{u.division}</dd></div>
              <div><dt className="inline text-slate-500">Mobile: </dt><dd className="inline text-slate-900">{u.mobile}</dd></div>
              <div><dt className="inline text-slate-500">Username: </dt><dd className="inline font-mono text-slate-900">{u.username}</dd></div>
              <div><dt className="inline text-slate-500">Last active: </dt><dd className="inline text-slate-900">{u.lastLogin}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
};
