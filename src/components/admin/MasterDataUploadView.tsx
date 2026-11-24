'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Consumer, EquipmentInventory } from '@/types';
import * as XLSX from 'xlsx';

export const MasterDataUploadView: React.FC = () => {
  const { t } = useLang();
  const { uploadConsumers, uploadInventory } = useApp();

  const [activeUploadType, setActiveUploadType] = useState<'consumer' | 'panels' | 'inverters'>('consumer');
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  // Every row in the file. previewRows is only the first few, for display.
  const [allRows, setAllRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    inserted: number;
    updated?: number;
    duplicates?: string[];
    skipped?: { row: number; reason: string }[];
  } | null>(null);

  // Download sample template (FR-MD-008)
  const handleDownloadTemplate = () => {
    let templateData: any[] = [];
    let fileName = '';

    if (activeUploadType === 'consumer') {
      fileName = 'SolarTrack_Consumer_Master_Template.xlsx';
      templateData = [
        {
          'Consumer Number': 'AP-GNT-2026-009',
          Name: 'Koteswara Rao Malladi',
          Mobile: '+91 98765 10009',
          Village: 'Kaza',
          Mandal: 'Mangalagiri',
          District: 'Guntur',
          Division: 'Guntur Central',
          ULA: 'ULA-AP-2026-8820',
          'Capacity kW': 3.3,
        },
        {
          'Consumer Number': 'AP-GNT-2026-010',
          Name: 'Savitri Devi T.',
          Mobile: '+91 98765 10010',
          Village: 'Pedakakani',
          Mandal: 'Guntur Rural',
          District: 'Guntur',
          Division: 'Guntur Central',
          ULA: 'ULA-AP-2026-8821',
          'Capacity kW': 3.3,
        },
      ];
    } else if (activeUploadType === 'panels') {
      fileName = 'SolarTrack_Panel_Inventory_Template.xlsx';
      templateData = [
        { 'Serial Number': 'SP-540W-260401', Brand: 'Tata Power Solar', Model: 'Mono PERC 540W', Batch: 'B-2026-11C' },
        { 'Serial Number': 'SP-540W-260402', Brand: 'Tata Power Solar', Model: 'Mono PERC 540W', Batch: 'B-2026-11C' },
      ];
    } else {
      fileName = 'SolarTrack_Inverter_Inventory_Template.xlsx';
      templateData = [
        { 'Serial Number': 'INV-3.3KW-9010', Brand: 'Havells Solar', Model: 'Enviro 3.3kW Single Phase', Batch: 'H-2026-Q4' },
        { 'Serial Number': 'INV-3.3KW-9011', Brand: 'Sungrow', Model: 'SG3.0RS-S', Batch: 'SG-2026-11' },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  };

  // Parse uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setUploadResult(null);
    setParseError(null);
    setAllRows([]);
    setPreviewRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length > 0) {
          setDetectedColumns(Object.keys(data[0] as object));
          setAllRows(data);
          setPreviewRows(data.slice(0, 5));
        } else {
          setParseError(t('This file has no rows. Please fill in the template and try again.'));
        }
      } catch (err) {
        setParseError(t('This file could not be read. Please save it as Excel (.xlsx) or CSV and try again.'));
      }
    };
    reader.readAsBinaryString(uploadedFile);
    // Let the same file be chosen again after fixing it
    e.target.value = '';
  };

  // Read a cell whatever the header style: "Consumer Number", "consumerNumber", "consumer_number"...
  const cell = (row: any, ...names: string[]): string => {
    const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = names.map(norm);
    const key = Object.keys(row).find((k) => wanted.includes(norm(k)));
    return key === undefined ? '' : String(row[key] ?? '').trim();
  };

  // Commit Import (FR-MD-004, FR-MD-006, FR-MD-010)
  const handleCommitImport = () => {
    if (allRows.length === 0) return;
    const skipped: { row: number; reason: string }[] = [];
    // Excel row number = index + 2 (row 1 is the header)
    const rowNo = (i: number) => i + 2;

    if (activeUploadType === 'consumer') {
      const consumersToInsert: Consumer[] = [];
      allRows.forEach((r, i) => {
        const consumerNumber = cell(r, 'consumerNumber', 'Consumer Number', 'Consumer No');
        const name = cell(r, 'name', 'Beneficiary Name', 'Consumer Name');
        const ula = cell(r, 'ula', 'ULA Identifier');
        const missing = [
          !consumerNumber && t('Consumer Number'),
          !name && t('Name'),
          !ula && t('ULA'),
        ].filter(Boolean);
        if (missing.length > 0) {
          skipped.push({ row: rowNo(i), reason: t('Missing {list}', { list: missing.join(', ') }) });
          return;
        }
        const capacity = Number(cell(r, 'capacityKw', 'Capacity kW', 'Capacity'));
        consumersToInsert.push({
          id: `c_imp_${Date.now()}_${i}`,
          consumerNumber,
          name,
          mobile: cell(r, 'mobile', 'Mobile Number'),
          village: cell(r, 'village'),
          mandal: cell(r, 'mandal'),
          district: cell(r, 'district'),
          division: cell(r, 'division'),
          ula,
          status: 'Assigned',
          capacityKw: Number.isFinite(capacity) && capacity > 0 ? capacity : 3.3,
        });
      });

      const res = consumersToInsert.length > 0 ? uploadConsumers(consumersToInsert) : { inserted: 0, updated: 0 };
      setUploadResult({ success: consumersToInsert.length > 0, inserted: res.inserted, updated: res.updated, skipped });
    } else {
      const isPanel = activeUploadType === 'panels';
      const itemsToInsert: EquipmentInventory[] = [];
      allRows.forEach((r, i) => {
        const serialNumber = cell(r, 'serialNumber', 'Serial Number', 'Serial');
        if (!serialNumber) {
          skipped.push({ row: rowNo(i), reason: t('Missing {list}', { list: t('Serial Number') }) });
          return;
        }
        itemsToInsert.push({
          id: `inv_imp_${Date.now()}_${i}`,
          serialNumber,
          type: isPanel ? 'panel' : 'inverter',
          brand: cell(r, 'brand') || 'Not given',
          model: cell(r, 'model') || 'Not given',
          batch: cell(r, 'batch') || 'Not given',
          status: 'Available',
          receivedDate: new Date().toLocaleDateString('en-CA'),
          lastUpdated: new Date().toLocaleDateString('en-CA'),
        });
      });

      const res = itemsToInsert.length > 0 ? uploadInventory(itemsToInsert) : { inserted: 0, duplicateSerials: [] };
      setUploadResult({ success: res.inserted > 0, inserted: res.inserted, duplicates: res.duplicateSerials, skipped });
    }

    setPreviewRows([]);
    setAllRows([]);
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("Upload Excel Lists")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("Add consumers, panels and inverters from an Excel file. Choose the type of list first.")}</p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-brand-600" />
          <span>
            {activeUploadType === 'consumer'
              ? t('Download Consumer Template')
              : activeUploadType === 'panels'
              ? t('Download Panel Template')
              : t('Download Inverter Template')}
          </span>
        </button>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label={t("Type of list")}>
        {[
          { key: 'consumer', label: 'Consumer list', desc: 'Names, villages, mobile and ULA numbers' },
          { key: 'panels', label: 'Panel list', desc: 'Serial numbers of solar panels in stock' },
          { key: 'inverters', label: 'Inverter list', desc: 'Serial numbers of inverters in stock' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveUploadType(tab.key as any);
              setPreviewRows([]);
              setAllRows([]);
              setFile(null);
              setUploadResult(null);
              setParseError(null);
            }}
            className={`flex-1 p-4 rounded-2xl border text-left transition-all ${
              activeUploadType === tab.key
                ? 'bg-brand-50/70 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-base font-bold text-slate-900">{t(tab.label)}</div>
            <div className="text-sm text-slate-600 mt-0.5">{t(tab.desc)}</div>
          </button>
        ))}
      </div>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
          <Upload className="w-10 h-10 text-brand-600 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-800">
            {file
              ? file.name
              : activeUploadType === 'consumer'
              ? t('Choose the consumer list Excel or CSV file')
              : activeUploadType === 'panels'
              ? t('Choose the panel list Excel or CSV file')
              : t('Choose the inverter list Excel or CSV file')}
          </div>
          <p className="text-xs text-slate-400 mt-1">{t("Supports .xlsx, .xls, and .csv files up to 15MB")}</p>

          <label className="mt-4 inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors">
            <span>{t("Browse Files")}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {parseError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Column Auto-Detection & Preview (FR-MD-007) */}
        {previewRows.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t("Detected Columns & Sample Preview")}</h3>
                <p className="text-xs text-slate-500">
                  {t('{n} rows found in the file • Showing the first {m} below', { n: allRows.length, m: previewRows.length })}
                </p>
              </div>

              <button
                onClick={handleCommitImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <span>{t('Import all {n} rows', { n: allRows.length })}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    {detectedColumns.map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {detectedColumns.map((col) => (
                        <td key={col} className="py-2.5 px-3 font-mono text-xs">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Result Alert */}
        {uploadResult && (
          <div
            className={`p-4 border rounded-xl text-sm flex items-start gap-3 ${
              uploadResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {uploadResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-2">
              <div className="font-bold">
                {uploadResult.success ? t("Import finished") : t("Nothing was imported")}
              </div>
              <p>
                <span className="font-bold">{t('{n} added', { n: uploadResult.inserted })}</span>
                {uploadResult.updated !== undefined && ', ' + t('{n} existing records updated', { n: uploadResult.updated })}.
              </p>
              {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                <div className="text-amber-800">
                  {t('{n} serial numbers were already in stock and were skipped:', { n: uploadResult.duplicates.length })}
                  <span className="font-mono ml-1">{uploadResult.duplicates.join(', ')}</span>
                </div>
              )}
              {uploadResult.skipped && uploadResult.skipped.length > 0 && (
                <div className="text-amber-900">
                  <div className="font-semibold">
                    {t('{n} rows were skipped. Fix them in the file and upload again:', { n: uploadResult.skipped.length })}
                  </div>
                  <ul className="mt-1 list-disc pl-5 max-h-40 overflow-y-auto">
                    {uploadResult.skipped.map((sk) => (
                      <li key={sk.row}>
                        {t('Row {n}', { n: sk.row })}: {sk.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
