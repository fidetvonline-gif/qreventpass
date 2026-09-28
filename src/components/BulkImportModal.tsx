import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { storage } from '../services/storage';
import { generateToken, generateReferenceNumber } from '../services/qr';
import { Guest, GuestCategory } from '../types';

interface BulkImportModalProps {
  eventId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedRow {
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  category: GuestCategory;
  isValid: boolean;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ eventId, onClose, onSuccess }) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCsvContent = `name,email,phone,category,organization
Engr. Bassey Dan,bassey.dan@aksenergy.org,08034567890,VIP,Aks Energy Group
Idara Udom,idara.udom@designco.ng,08081234567,General Guest,DesignCo Uyo
Professor Etop Udosen,etop.udosen@unical.edu.ng,08029876543,Speaker,University Faculty
Blessing Okon,blessing.okon@punchng.com,08145678901,Media,Punch Newspapers
Samuel Nsikak,samuel@startuphub.ng,08092345678,Partner,StartupHub Inc`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'eventpass_guest_import_template.csv';
    link.click();
  };

  const parseCsvText = (text: string) => {
    try {
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErrorMsg('CSV file must have a header row and at least one data row.');
        return;
      }

      // Check header
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nameIdx = header.findIndex(h => h.includes('name'));
      const emailIdx = header.findIndex(h => h.includes('email'));
      const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile'));
      const catIdx = header.findIndex(h => h.includes('category') || h.includes('role') || h.includes('type'));
      const orgIdx = header.findIndex(h => h.includes('org') || h.includes('company'));

      if (nameIdx === -1 || emailIdx === -1) {
        setErrorMsg('CSV must contain at least "name" and "email" columns.');
        return;
      }

      const validCategories: GuestCategory[] = [
        'VIP', 'Speaker', 'Staff', 'Media', 'General Guest', 'Partner', 'Student', 'Government Official'
      ];

      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        const full_name = cols[nameIdx] || '';
        const email = cols[emailIdx] || '';
        const phone = phoneIdx !== -1 ? cols[phoneIdx] || '' : '';
        const rawCat = catIdx !== -1 ? cols[catIdx] || '' : 'General Guest';
        const organization = orgIdx !== -1 ? cols[orgIdx] || '' : '';

        // Match category
        let category: GuestCategory = 'General Guest';
        const matchedCat = validCategories.find(c => c.toLowerCase() === rawCat.toLowerCase());
        if (matchedCat) {
          category = matchedCat;
        } else if (rawCat.toLowerCase().includes('vip')) {
          category = 'VIP';
        } else if (rawCat.toLowerCase().includes('speak')) {
          category = 'Speaker';
        } else if (rawCat.toLowerCase().includes('media') || rawCat.toLowerCase().includes('press')) {
          category = 'Media';
        } else if (rawCat.toLowerCase().includes('gov') || rawCat.toLowerCase().includes('official')) {
          category = 'Government Official';
        }

        const isValid = Boolean(full_name && email && email.includes('@'));

        rows.push({
          full_name,
          email,
          phone,
          organization,
          category,
          isValid,
          error: !isValid ? 'Missing name or valid email address' : undefined,
        });
      }

      setParsedRows(rows);
      setErrorMsg(null);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to parse CSV file. Please check format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const validOnes = parsedRows.filter(r => r.isValid);
    if (validOnes.length === 0) {
      setErrorMsg('No valid rows found to import.');
      return;
    }

    setIsImporting(true);

    validOnes.forEach((row) => {
      const newGuest: Guest = {
        id: `gst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        event_id: eventId,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone || '+234 800 000 0000',
        organization: row.organization || 'Attendee',
        category: row.category,
        reference_number: generateReferenceNumber(),
        qr_token: generateToken(),
        is_active: true,
        check_in_status: 'pending',
        check_in_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      storage.saveGuest(newGuest);
    });

    storage.logAudit(
      'Organizer',
      'Event Organizer',
      eventId,
      'Bulk Guest Import',
      `Imported ${validOnes.length} guests via CSV (${fileName}).`
    );

    setIsImporting(false);
    onSuccess(validOnes.length);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h3 className="font-bold text-sm tracking-wide">BULK GUEST IMPORT (CSV)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Upload guest roster with automated QR pass generation</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-800">
              {fileName ? fileName : 'Click to browse or drag and drop your CSV file'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Supported columns: name, email, phone, category, organization
            </p>
          </div>

          {/* Download sample & error banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Template (.csv)</span>
            </button>

            {parsedRows.length > 0 && (
              <span className="text-slate-500">
                <strong className="text-emerald-600 font-bold">{validCount} valid</strong> of {parsedRows.length} total rows
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-200">
                Data Preview & Validation
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Organization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1" title={row.error}>
                              <AlertCircle className="w-3.5 h-3.5" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.full_name}</td>
                        <td className="px-3 py-2 text-slate-600">{row.email}</td>
                        <td className="px-3 py-2 text-slate-700">{row.category}</td>
                        <td className="px-3 py-2 text-slate-500">{row.organization || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0 || isImporting}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            {isImporting ? 'Importing...' : `Import ${validCount} Guests`}
          </button>
        </div>
      </div>
    </div>
  );
};
