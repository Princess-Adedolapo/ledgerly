import { useState, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Modal, Button, StatusBadge } from '../ui';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { supabase, CONTACT_STATUSES, type Contact } from '../../lib/supabase';
import { exportToCSV } from '../../utils/csvExport';
import { useToast } from '../../contexts/ToastContext';
import { useActivityLog } from '../../contexts/ActivityLogContext';

interface CSVImportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  existingContacts?: Contact[];
  onSuccess: () => void;
}

interface ColumnMapping {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  description_type: string;
  description_note: string;
}

const DEFAULT_CATEGORIES = [
  'Other / Uncategorized',
  'General Inquiry',
  'Product/Service Interest',
  'Support & Complaint'
] as const;

function isMissingColumnError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('column') ||
    msg.includes('schema cache') ||
    msg.includes('description_type') ||
    msg.includes('description_note')
  );
}

export function CSVImportModal({
  open,
  onClose,
  workspaceId,
  existingContacts = [],
  onSuccess,
}: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: '',
    description_type: '',
    description_note: '',
  });
  const [defaultStatus, setDefaultStatus] = useState<string>('Lead');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();

  const handleReset = () => {
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setMapping({
      name: '',
      email: '',
      phone: '',
      company: '',
      status: '',
      description_type: '',
      description_note: '',
    });
    setStep('upload');
    setErrorMessage(null);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const autoMapHeaders = (headers: string[]): ColumnMapping => {
    const cleanHeaders = headers.map((h) => ({ original: h, lower: h.trim().toLowerCase() }));

    const findMatch = (candidates: string[]) => {
      const match = cleanHeaders.find((h) => candidates.some((c) => h.lower === c || h.lower.includes(c)));
      return match ? match.original : '';
    };

    return {
      name: findMatch(['name', 'full name', 'contact name', 'customer name', 'contact', 'first name']),
      email: findMatch(['email', 'email address', 'e-mail', 'mail']),
      phone: findMatch(['phone', 'phone number', 'whatsapp', 'mobile', 'tel', 'telephone']),
      company: findMatch(['business name', 'company', 'company name', 'organization', 'business', 'org']),
      status: findMatch(['status', 'lead status', 'stage', 'type']),
      description_type: findMatch(['category', 'description type', 'classification', 'type']),
      description_note: findMatch(['description note', 'note', 'notes', 'description', 'details']),
    };
  };

  const processCSVFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv' && selectedFile.type !== 'application/vnd.ms-excel') {
      setErrorMessage('Please select a valid CSV file (.csv).');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMessage('Error reading CSV file. Please ensure it is correctly formatted.');
          return;
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setErrorMessage('No headers found in CSV file. First line must contain header names.');
          return;
        }

        setParsedHeaders(headers);
        setParsedRows(results.data);
        const initialMapping = autoMapHeaders(headers);
        setMapping(initialMapping);
        setStep('map');
      },
      error: (err) => {
        setErrorMessage(`Failed to parse CSV file: ${err.message}`);
      },
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSVFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Name': 'Jane Doe',
        'Email': 'jane.doe@example.com',
        'Phone': '2348012345678',
        'Business Name': 'Acme Global',
        'Status': 'Lead',
        'Category': 'General Inquiry',
        'Description Note': 'Met at trade show, interested in demo',
      },
      {
        'Name': 'John Smith',
        'Email': 'john@techcorp.com',
        'Phone': '15559876543',
        'Business Name': 'TechCorp Ltd',
        'Status': 'Active',
        'Category': 'Product/Service Interest',
        'Description Note': 'Subscribed to monthly tier',
      },
    ];
    exportToCSV(sampleData, 'contacts_import_template.csv');
  };

  // Prepare mapped preview items
  const mappedRecords = parsedRows.map((row) => {
    const rawName = mapping.name ? row[mapping.name]?.trim() : '';
    const rawEmail = mapping.email ? row[mapping.email]?.trim() : '';
    const rawPhone = mapping.phone ? row[mapping.phone]?.trim() : '';
    const rawCompany = mapping.company ? row[mapping.company]?.trim() : '';
    const rawStatus = mapping.status ? row[mapping.status]?.trim() : '';
    const rawCategory = mapping.description_type ? row[mapping.description_type]?.trim() : '';
    const rawNote = mapping.description_note ? row[mapping.description_note]?.trim() : '';

    // Validate Status against CONTACT_STATUSES
    const matchedStatus = CONTACT_STATUSES.find(
      (s) => s.toLowerCase() === rawStatus.toLowerCase()
    );
    const finalStatus = matchedStatus || defaultStatus;

    // Validate Category against DEFAULT_CATEGORIES
    const matchedCat = DEFAULT_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.toLowerCase()
    );
    const finalCategory = matchedCat || 'Other / Uncategorized';

    // Smart display name fallback if Name header is missing or 'N/A'
    const cleanName = rawName && rawName.toUpperCase() !== 'N/A' && rawName.trim().length > 0 ? rawName : null;
    const finalName = cleanName || rawPhone || rawEmail || rawCompany || 'Unnamed Contact';

    return {
      name: finalName,
      email: rawEmail || null,
      phone: rawPhone || null,
      company: rawCompany || null,
      status: finalStatus,
      description_type: finalCategory,
      description_note: rawNote || null,
    };
  });

  // Filter existing duplicates if option checked
  const existingEmailSet = new Set(
    existingContacts.map((c) => c.email?.toLowerCase()).filter(Boolean)
  );

  const finalRecordsToImport = skipDuplicates
    ? mappedRecords.filter((r) => !r.email || !existingEmailSet.has(r.email.toLowerCase()))
    : mappedRecords;

  const duplicateCount = mappedRecords.length - finalRecordsToImport.length;

  const handlePerformImport = async () => {
    if (!workspaceId) {
      addToast('error', 'Import Error', 'No active workspace selected.');
      return;
    }

    if (finalRecordsToImport.length === 0) {
      addToast('error', 'No Records', 'No valid records available to import.');
      return;
    }

    setImporting(true);
    setErrorMessage(null);

    try {
      const recordsToInsert = finalRecordsToImport.map((record) => ({
        ...record,
        workspace_id: workspaceId,
      }));

      // Batch in chunks of 50
      const BATCH_SIZE = 50;
      let insertedTotal = 0;

      for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
        const batch = recordsToInsert.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase.from('contacts').insert(batch);

        // Fallback if DB doesn't support classification columns
        if (insertError && isMissingColumnError(insertError)) {
          console.warn('Database schema does not support classification columns. Falling back to basic insert.', insertError);
          const basicBatch = batch.map((item) => {
            const { description_type, description_note, ...basic } = item;
            void description_type;
            void description_note;
            return basic;
          });
          const retryResult = await supabase.from('contacts').insert(basicBatch).select('id, email, phone, name');

          if (retryResult.error) {
            throw new Error(retryResult.error.message);
          }

          // Save category fallbacks in localStorage for each newly inserted contact
          const insertedData = retryResult.data || [];
          batch.forEach((item, index) => {
            const insertedRow = insertedData[index];
            const fallbackObj = {
              description_type: item.description_type,
              description_note: item.description_note,
            };
            if (insertedRow && insertedRow.id) {
              try {
                localStorage.setItem(`contact_fallback_${insertedRow.id}`, JSON.stringify(fallbackObj));
              } catch (e) {
                console.error(e);
              }
            }
            if (item.email) {
              try {
                localStorage.setItem(`contact_fallback_${item.email}`, JSON.stringify(fallbackObj));
              } catch (e) {
                console.error(e);
              }
            }
          });
        } else if (insertError) {
          throw new Error(insertError.message);
        }

        insertedTotal += batch.length;
      }

      logActivity('contacts', 'imported', `Imported ${insertedTotal} contacts via CSV`);
      addToast('success', 'Import Successful', `Successfully imported ${insertedTotal} contact${insertedTotal === 1 ? '' : 's'}.`);
      handleModalClose();
      onSuccess();
    } catch (err) {
      console.error('CSV import failed:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during import.';
      setErrorMessage(msg);
      addToast('error', 'Import Failed', msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleModalClose} title="Import Contacts from CSV">
      <div className="space-y-5">
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-400 rounded-xl p-8 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Click to upload or drag & drop CSV file
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports .csv files with headers (Name, Email, Phone, Company, Status)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Need a starting format?</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Map Headers */}
        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 p-3 rounded-xl text-xs text-violet-700 dark:text-violet-300">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="font-semibold">{file?.name}</span>
                <span className="text-gray-500 dark:text-gray-400">({parsedRows.length} rows detected)</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline"
              >
                Change File
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Match columns from your CSV file to the corresponding CRM contact fields:
            </p>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {[
                { key: 'name', label: 'Name *', required: true },
                { key: 'email', label: 'Email Address' },
                { key: 'phone', label: 'Phone / WhatsApp' },
                { key: 'company', label: 'Business / Company Name' },
                { key: 'status', label: 'Contact Status' },
                { key: 'description_type', label: 'Category / Type' },
                { key: 'description_note', label: 'Description Note' },
              ].map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 min-w-[140px]">
                    {field.label}
                  </span>
                  <select
                    value={mapping[field.key as keyof ColumnMapping]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">(Skip this field)</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-800">
              <Button variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!mapping.name}
              >
                Continue to Preview →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Options */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 block">Total CSV Rows</span>
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">{parsedRows.length}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 block">Ready to Import</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{finalRecordsToImport.length}</span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700/80 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-gray-700 dark:text-gray-300 font-medium">Default Status for unmapped rows:</label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs"
                >
                  {CONTACT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="skipDuplicates" className="text-gray-700 dark:text-gray-300">
                  Skip contacts with existing email addresses in workspace ({duplicateCount} skipped)
                </label>
              </div>
            </div>

            {/* First 3-5 rows preview table */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Preview Mapped Data (First {Math.min(5, finalRecordsToImport.length)} rows)
              </p>
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto max-h-[160px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium">Name</th>
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Phone</th>
                      <th className="p-2 font-medium">Company</th>
                      <th className="p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                    {finalRecordsToImport.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-semibold whitespace-nowrap">{row.name}</td>
                        <td className="p-2 text-gray-500 dark:text-gray-400">{row.email || '—'}</td>
                        <td className="p-2 text-gray-500 dark:text-gray-400">{row.phone || '—'}</td>
                        <td className="p-2 text-gray-500 dark:text-gray-400">{row.company || '—'}</td>
                        <td className="p-2"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-800">
              <Button variant="secondary" onClick={() => setStep('map')} disabled={importing}>
                ← Back to Mapping
              </Button>
              <Button onClick={handlePerformImport} disabled={importing || finalRecordsToImport.length === 0}>
                {importing ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Import {finalRecordsToImport.length} Contacts
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
