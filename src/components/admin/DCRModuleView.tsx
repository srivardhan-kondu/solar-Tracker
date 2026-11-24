'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export const DCRModuleView: React.FC = () => {
  const { dcrRecords, reconcileDCRFile } = useApp();

  const [dcrFile, setDcrFile] = useState<File | null>(null);
  const [dcrRows, setDcrRows] = useState<{ ula: string; dcrNumber: string }[]>([]);
  const [reconcileResult, setReconcileResult] = useState<{
    matched: number;
    unmatched: number;
    conflicts: number;
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchUla, setSearchUla] = useState('');

  // Sample DCR template download (FR-DCR-001)
  const handleDownloadDcrTemplate = () => {
    const sample = [
      { ULA: 'ULA-AP-2026-8813', DCR_NUMBER: 'DCR-2026-MNRE-77196' },
      { ULA: 'ULA-AP-2026-8814', DCR_NUMBER: 'DCR-2026-MNRE-77197' },
      { ULA: 'ULA-AP-2026-8815', DCR_NUMBER: 'DCR-2026-MNRE-77198' },
      { ULA: 'ULA-AP-2026-9999', DCR_NUMBER: 'DCR-2026-MNRE-77199' }, // deliberate unmapped to test exception
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DCR_Template');
    XLSX.writeFile(wb, 'SolarTrack_DCR_Upload_Template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDcrFile(file);
    setReconcileResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed = data.map((row) => ({
          ula: String(row.ULA || row.ula || row['ULA Identifier'] || ''),
          dcrNumber: String(row.DCR_NUMBER || row.dcrNumber || row['DCR Number'] || ''),
        }));

        setDcrRows(parsed);
      } catch {
        alert('Could not parse DCR Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteReconciliation = () => {
    if (dcrRows.length === 0 || !dcrFile) return;

    const res = reconcileDCRFile(dcrRows, dcrFile.name);
    setReconcileResult(res);
    setDcrRows([]);
    setDcrFile(null);
  };

  const filteredDcrList = dcrRecords.filter((d) => {
    const matchStatus = filterStatus === 'All' || d.status === filterStatus;
    const matchSearch =
      d.ula.toLowerCase().includes(searchUla.toLowerCase()) ||
      d.dcrNumber.toLowerCase().includes(searchUla.toLowerCase()) ||
      (d.consumerName && d.consumerName.toLowerCase().includes(searchUla.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DCR Reconciliation Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated ULA-to-Consumer matching, MNRE DCR mapping, and conflict exception management.
          </p>
        </div>

        <button
          onClick={handleDownloadDcrTemplate}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-brand-600" />
          <span>Download DCR Template</span>
        </button>
      </div>

      {/* Upload & Reconcile Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
          <FileSpreadsheet className="w-10 h-10 text-brand-600 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-800">
            {dcrFile ? dcrFile.name : 'Upload Discom / MNRE DCR Excel Spreadsheet'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Requires ULA and DCR_NUMBER columns</p>

          <label className="mt-3 inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors">
            <span>Select DCR File</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Preview and Execution */}
        {dcrRows.length > 0 && (
          <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Ready to Reconcile ({dcrRows.length} Rows Detected)
                </div>
                <div className="text-[11px] text-slate-500">
                  System will cross-reference ULA against consumer master database.
                </div>
              </div>
              <button
                onClick={handleExecuteReconciliation}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
              >
                <span>Run Automated Match</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Results Banner */}
        {reconcileResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Reconciliation Finished</div>
              <div className="mt-1 flex gap-4 text-xs">
                <span className="font-bold text-emerald-700">✓ {reconcileResult.matched} Successfully Matched</span>
                <span className="font-bold text-amber-700">⚠ {reconcileResult.unmatched} ULA Not Found</span>
                <span className="font-bold text-red-700">✕ {reconcileResult.conflicts} Existing Value Conflicts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reconciled Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchUla}
              onChange={(e) => setSearchUla(e.target.value)}
              placeholder="Search ULA, DCR # or Consumer..."
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700"
            >
              <option value="All">All Results</option>
              <option value="Matched">Matched</option>
              <option value="ULA Not Found">ULA Not Found</option>
              <option value="Existing Value Conflict">Existing Value Conflict</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">ULA Key</th>
                <th className="py-3 px-4">DCR Number</th>
                <th className="py-3 px-4">Linked Consumer</th>
                <th className="py-3 px-4">Batch Source</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Mapping Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDcrList.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.ula}</td>
                  <td className="py-3 px-4 font-mono font-bold text-brand-700">{d.dcrNumber}</td>
                  <td className="py-3 px-4">
                    {d.consumerNumber ? (
                      <div>
                        <div className="font-bold text-slate-900">{d.consumerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{d.consumerNumber}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No master record</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{d.sourceFile}</td>
                  <td className="py-3 px-4 text-slate-400">{d.uploadedAt}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        d.status === 'Matched'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.status === 'ULA Not Found'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {d.status}
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
