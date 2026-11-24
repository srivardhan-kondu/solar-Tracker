'use client';

import React, { useState } from 'react';
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
  const { uploadConsumers, uploadInventory } = useApp();

  const [activeUploadType, setActiveUploadType] = useState<'consumer' | 'panels' | 'inverters'>('consumer');
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    inserted: number;
    updated?: number;
    duplicates?: string[];
  } | null>(null);

  // Download sample template (FR-MD-008)
  const handleDownloadTemplate = () => {
    let templateData: any[] = [];
    let fileName = '';

    if (activeUploadType === 'consumer') {
      fileName = 'SolarTrack_Consumer_Master_Template.xlsx';
      templateData = [
        {
          consumerNumber: 'AP-GNT-2026-009',
          name: 'Koteswara Rao Malladi',
          mobile: '+91 98765 10009',
          village: 'Kaza',
          mandal: 'Mangalagiri',
          district: 'Guntur',
          division: 'Guntur Central',
          ula: 'ULA-AP-2026-8820',
          capacityKw: 3.3,
        },
        {
          consumerNumber: 'AP-GNT-2026-010',
          name: 'Savitri Devi T.',
          mobile: '+91 98765 10010',
          village: 'Pedakakani',
          mandal: 'Guntur Rural',
          district: 'Guntur',
          division: 'Guntur Central',
          ula: 'ULA-AP-2026-8821',
          capacityKw: 3.3,
        },
      ];
    } else if (activeUploadType === 'panels') {
      fileName = 'SolarTrack_Panel_Inventory_Template.xlsx';
      templateData = [
        {
          serialNumber: 'SP-540W-260401',
          brand: 'Tata Power Solar',
          model: 'Mono PERC 540W',
          batch: 'B-2026-11C',
        },
        {
          serialNumber: 'SP-540W-260402',
          brand: 'Tata Power Solar',
          model: 'Mono PERC 540W',
          batch: 'B-2026-11C',
        },
      ];
    } else {
      fileName = 'SolarTrack_Inverter_Inventory_Template.xlsx';
      templateData = [
        {
          serialNumber: 'INV-3.3KW-9010',
          brand: 'Havells Solar',
          model: 'Enviro 3.3kW Single Phase',
          batch: 'H-2026-Q4',
        },
        {
          serialNumber: 'INV-3.3KW-9011',
          brand: 'Sungrow',
          model: 'SG3.0RS-S',
          batch: 'SG-2026-11',
        },
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
          setPreviewRows(data.slice(0, 5));
        }
      } catch (err) {
        alert('Failed to parse Excel file. Please use a valid .xlsx or .csv format.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Commit Import (FR-MD-004, FR-MD-006, FR-MD-010)
  const handleCommitImport = () => {
    if (previewRows.length === 0) return;

    if (activeUploadType === 'consumer') {
      const consumersToInsert: Consumer[] = previewRows.map((r, i) => ({
        id: `c_imp_${Date.now()}_${i}`,
        consumerNumber: r.consumerNumber || `AP-GNT-2026-${Math.floor(100 + Math.random() * 900)}`,
        name: r.name || 'Sample Beneficiary',
        mobile: r.mobile || '+91 98765 00000',
        village: r.village || 'Guntur Village',
        mandal: r.mandal || 'Guntur Mandal',
        district: r.district || 'Guntur',
        division: r.division || 'Guntur Central',
        ula: r.ula || `ULA-AP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'Assigned',
        capacityKw: r.capacityKw ? Number(r.capacityKw) : 3.3,
      }));

      const res = uploadConsumers(consumersToInsert);
      setUploadResult({ success: true, inserted: res.inserted, updated: res.updated });
    } else {
      const isPanel = activeUploadType === 'panels';
      const itemsToInsert: EquipmentInventory[] = previewRows.map((r, i) => ({
        id: `inv_imp_${Date.now()}_${i}`,
        serialNumber: r.serialNumber || `${isPanel ? 'SP-540W' : 'INV-3.3KW'}-${Date.now()}_${i}`,
        type: isPanel ? 'panel' : 'inverter',
        brand: r.brand || (isPanel ? 'Tata Power Solar' : 'Havells Solar'),
        model: r.model || (isPanel ? 'Mono PERC 540W' : 'Enviro 3.3kW'),
        batch: r.batch || 'BATCH-2026-NOV',
        status: 'Available',
        receivedDate: new Date().toLocaleDateString('en-CA'),
        lastUpdated: new Date().toLocaleDateString('en-CA'),
      }));

      const res = uploadInventory(itemsToInsert);
      setUploadResult({ success: true, inserted: res.inserted, duplicates: res.duplicateSerials });
    }

    setPreviewRows([]);
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Master Data Upload Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk ingest Consumer records, Solar Panel Barcodes, and Inverter Serial Numbers.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-brand-600" />
          <span>Download Standard Template</span>
        </button>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="flex gap-3">
        {[
          { key: 'consumer', label: '1. Consumer Master', desc: 'Beneficiary details, village & ULA' },
          { key: 'panels', label: '2. Panel Inventory', desc: 'Solar PV panel barcodes' },
          { key: 'inverters', label: '3. Inverter Inventory', desc: 'Inverter serials & warehouse stock' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveUploadType(tab.key as any);
              setPreviewRows([]);
              setFile(null);
              setUploadResult(null);
            }}
            className={`flex-1 p-4 rounded-2xl border text-left transition-all ${
              activeUploadType === tab.key
                ? 'bg-brand-50/70 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">{tab.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
          <Upload className="w-10 h-10 text-brand-600 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-800">
            {file ? file.name : `Select or drag ${activeUploadType} Excel/CSV file`}
          </div>
          <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, and .csv files up to 15MB</p>

          <label className="mt-4 inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors">
            <span>Browse Files</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Column Auto-Detection & Preview (FR-MD-007) */}
        {previewRows.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Detected Columns & Sample Preview</h3>
                <p className="text-xs text-slate-500">
                  Detected {detectedColumns.length} columns • Showing first {previewRows.length} sample rows
                </p>
              </div>

              <button
                onClick={handleCommitImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <span>Confirm & Commit Import</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
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
                        <td key={col} className="py-2.5 px-3 font-mono text-[11px]">
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
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Import Completed Successfully!</div>
              <p className="mt-0.5 text-emerald-800">
                Processed records: <span className="font-bold">{uploadResult.inserted} added</span>
                {uploadResult.updated !== undefined && `, ${uploadResult.updated} existing records updated`}.
              </p>
              {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                <div className="mt-2 text-amber-800 font-medium">
                  {uploadResult.duplicates.length} duplicate serial numbers were safely detected and skipped:
                  <span className="font-mono ml-1">{uploadResult.duplicates.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
