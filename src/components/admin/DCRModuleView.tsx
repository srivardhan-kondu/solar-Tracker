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

const DCR_STATUS_LABEL: Record<string, string> = {
  Matched: 'Matched',
  'ULA Not Found': 'ULA not found',
  'Existing Value Conflict': 'Different DCR already saved',
  'Duplicate ULA': 'ULA repeated in file',
  'Duplicate DCR': 'DCR repeated in file',
  Resolved: 'Resolved',
};
const dcrStatusClass = (status: string) =>
  status === 'Matched' || status === 'Resolved'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'ULA Not Found'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800';

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
  const [parseError, setParseError] = useState<string | null>(null);

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
    setParseError(null);
    setDcrRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed = data
          .map((row) => ({
            ula: String(row.ULA || row.ula || row['ULA Identifier'] || '').trim(),
            dcrNumber: String(row.DCR_NUMBER || row.dcrNumber || row['DCR Number'] || '').trim(),
          }))
          .filter((r) => r.ula || r.dcrNumber);

        if (parsed.length === 0) {
          setParseError('No ULA and DCR numbers were found. The file needs two columns named "ULA" and "DCR_NUMBER".');
        } else if (parsed.some((r) => !r.ula || !r.dcrNumber)) {
          setParseError(
            `${parsed.filter((r) => !r.ula || !r.dcrNumber).length} rows are missing a ULA or a DCR number. Please fill them in and upload again.`
          );
        } else {
          setDcrRows(parsed);
        }
      } catch {
        setParseError('This file could not be read. Please save it as Excel (.xlsx) or CSV and try again.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DCR Numbers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload the DCR list you receive. Each row is matched to a consumer using the ULA number, and the DCR number
            is saved on that consumer automatically.
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
          <p className="text-sm text-slate-500 mt-1">The file needs two columns: ULA and DCR_NUMBER. Download the template to see the format.</p>

          <label className="mt-3 inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors">
            <span>Select DCR File</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {parseError && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview and Execution */}
        {dcrRows.length > 0 && (
          <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {dcrRows.length} rows ready to match
                </div>
                <div className="text-xs text-slate-500">
                  System will cross-reference ULA against consumer master database.
                </div>
              </div>
              <button
                onClick={handleExecuteReconciliation}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
              >
                <span>Match now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Results Banner */}
        {reconcileResult &&
          (() => {
            const problems = reconcileResult.unmatched + reconcileResult.conflicts;
            const tone =
              problems === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : reconcileResult.matched === 0
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-amber-50 border-amber-200 text-amber-950';
            return (
              <div className={`p-4 border rounded-xl text-sm flex items-start gap-3 ${tone}`}>
                {problems === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">
                    {problems === 0 ? 'All rows matched' : `${problems} rows need attention`}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-semibold text-emerald-700">✓ {reconcileResult.matched} matched and saved</span>
                    {reconcileResult.unmatched > 0 && (
                      <span className="font-semibold text-amber-800">
                        ⚠ {reconcileResult.unmatched} ULA numbers not found in the consumer list
                      </span>
                    )}
                    {reconcileResult.conflicts > 0 && (
                      <span className="font-semibold text-red-700">
                        ✕ {reconcileResult.conflicts} consumers already have a different DCR number
                      </span>
                    )}
                  </div>
                  {problems > 0 && (
                    <p>
                      They are listed in the table below.
                      {reconcileResult.unmatched > 0 && ' Rows whose ULA was not found were also added to "Problems to Fix".'}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* Matched rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 xl:flex xl:justify-between xl:items-center">
          <label className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchUla}
              onChange={(e) => setSearchUla(e.target.value)}
              placeholder="Search ULA, DCR or consumer"
              aria-label="Search DCR rows"
              className="w-full xl:w-80 pl-10 pr-3 py-2 text-base bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-600"
            />
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by result"
            className="text-base bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
          >
            <option value="All">All rows</option>
            <option value="Matched">Matched</option>
            <option value="ULA Not Found">ULA not found</option>
            <option value="Existing Value Conflict">Different DCR already saved</option>
          </select>
        </div>

        {filteredDcrList.length === 0 && (
          <div className="p-10 text-center text-base text-slate-600">No DCR rows match.</div>
        )}

        {/* Smaller screens: cards */}
        <ul className="xl:hidden divide-y divide-slate-100">
          {filteredDcrList.map((d) => (
            <li key={d.id} className="p-4 space-y-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-base font-bold text-brand-700 break-all">{d.dcrNumber}</div>
                  <div className="text-sm text-slate-600 break-all">
                    ULA <span className="font-mono">{d.ula}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full font-bold text-sm ${dcrStatusClass(d.status)}`}>
                  {DCR_STATUS_LABEL[d.status] || d.status}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Consumer: </span>
                {d.consumerNumber ? (
                  <span className="text-slate-900 font-semibold">
                    {d.consumerName} (<span className="font-mono">{d.consumerNumber}</span>)
                  </span>
                ) : (
                  <span className="text-slate-700">No consumer with this ULA</span>
                )}
              </div>
              {d.conflictDetails && <div className="text-sm text-slate-700">{d.conflictDetails}</div>}
              <div className="text-sm text-slate-500 break-all">
                {d.sourceFile} · {d.uploadedAt}
              </div>
            </li>
          ))}
        </ul>

        {/* Wide screens: table */}
        {filteredDcrList.length > 0 && (
          <div className="hidden xl:block relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">DCR number / ULA</th>
                  <th className="py-3 px-4">Consumer</th>
                  <th className="py-3 px-4">From file</th>
                  <th className="py-3 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDcrList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-brand-700">{d.dcrNumber}</div>
                      <div className="font-mono text-slate-600">{d.ula}</div>
                    </td>
                    <td className="py-3 px-4">
                      {d.consumerNumber ? (
                        <>
                          <div className="font-bold text-slate-900">{d.consumerName}</div>
                          <div className="font-mono text-slate-500">{d.consumerNumber}</div>
                        </>
                      ) : (
                        <span className="text-slate-600">No consumer with this ULA</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="break-all">{d.sourceFile}</div>
                      <div className="text-slate-500">{d.uploadedAt}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs whitespace-nowrap ${dcrStatusClass(d.status)}`}>
                        {DCR_STATUS_LABEL[d.status] || d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
