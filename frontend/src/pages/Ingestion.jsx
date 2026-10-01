import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, RefreshCw, FileCode, Check } from 'lucide-react';
import { ingestJson, ingestFile } from '../services/api';

export default function Ingestion() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'json'
  const [selectedFile, setSelectedFile] = useState(null);
  const [recordType, setRecordType] = useState('charges');
  const [isDragging, setIsDragging] = useState(false);

  const [jsonText, setJsonText] = useState(JSON.stringify({
    charges: [
      {
        charge_id: "CHG-CUSTOM-900",
        shipment_id: "SH-1002",
        order_id: "ORD-2002",
        sku: "SKU-HOME-02",
        reason: "Packaging Defect Charge",
        amount: 54.00,
        currency: "USD"
      }
    ]
  }, null, 2));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lastSubmissionMeta, setLastSubmissionMeta] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      if (activeTab === 'upload') {
        if (!selectedFile) {
          throw new Error('Please select or drop a CSV or JSON file.');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
        if (isCsv) {
          formData.append('record_type', recordType);
        }

        const res = await ingestFile(formData);
        setResult(res);
        setLastSubmissionMeta({
          filename: selectedFile.name,
          type: isCsv ? `CSV (${recordType})` : 'JSON file',
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        let parsed;
        try {
          parsed = JSON.parse(jsonText);
        } catch (err) {
          throw new Error(`JSON Syntax Error: ${err.message}`);
        }
        const res = await ingestJson(parsed);
        setResult(res);
        setLastSubmissionMeta({
          filename: 'payload.json (raw)',
          type: 'JSON payload',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const totalImported = result
    ? (result.charges_ingested || 0) +
      (result.orders_ingested || 0) +
      (result.shipments_ingested || 0) +
      (result.evidence_ingested || 0)
    : 0;

  return (
    <div className="page-container space-y-6">
      {/* Title & Description */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Data Ingestion</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Ingest operational logistics data and dispute chargebacks via CSV or JSON
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setActiveTab('upload'); setResult(null); setError(null); }}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-300'
          }`}
        >
          File Upload (CSV / JSON)
        </button>
        <button
          onClick={() => { setActiveTab('json'); setResult(null); setError(null); }}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'json' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-300'
          }`}
        >
          Paste Raw JSON Payload
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Ingestion Form Area */}
        <div className="lg:col-span-2 saas-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'upload' ? (
              <div className="space-y-4">
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
                  }`}
                >
                  <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : 'Click to browse or drop file here'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts .csv or .json files (Charges, Shipments, Orders, Evidence)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* CSV Record Type selector */}
                {selectedFile && selectedFile.name.toLowerCase().endsWith('.csv') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      CSV Record Type
                    </label>
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="charges">charges (charge_id, shipment_id, order_id, sku, reason, amount...)</option>
                      <option value="orders">orders (order_id, sku, quantity)</option>
                      <option value="shipments">shipments (shipment_id, order_id, sku, quantity, shipment_date)</option>
                      <option value="evidence">evidence (evidence_id, evidence_type, result, source, timestamp...)</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  JSON Ingestion Payload
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{loading ? 'Processing Ingestion...' : 'Import Data'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Ingestion Report & Status Card */}
        <div className="saas-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Ingestion Report
          </h2>

          {result ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Batch Processed ({totalImported} Records)</span>
              </div>

              {/* Requirement: Show filename, type, validation, imported records and errors */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Filename:</span>
                  <span className="font-mono font-semibold text-white">{lastSubmissionMeta?.filename}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Type:</span>
                  <span className="font-mono text-blue-400">{lastSubmissionMeta?.type}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Validation:</span>
                  <span className={`font-semibold ${result.errors && result.errors.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {result.errors && result.errors.length > 0 ? 'Validation Warnings' : 'Schema Validated (Pass)'}
                  </span>
                </div>
              </div>

              {/* Records imported breakdown */}
              <div className="space-y-1.5 font-mono text-slate-300">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Imported Records Breakdown
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Charges Imported:</span>
                  <span className="font-bold text-white">{result.charges_ingested}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Orders Imported:</span>
                  <span className="font-bold text-white">{result.orders_ingested}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Shipments Imported:</span>
                  <span className="font-bold text-white">{result.shipments_ingested}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Evidence Imported:</span>
                  <span className="font-bold text-white">{result.evidence_ingested}</span>
                </div>
              </div>

              {/* Errors breakdown */}
              {result.errors && result.errors.length > 0 ? (
                <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-1">
                  <div className="font-bold">Errors / Warnings ({result.errors.length}):</div>
                  <div className="text-[11px] space-y-1 max-h-36 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div key={i} className="font-mono">
                        [{err.record_type}] {err.identifier || 'unknown'}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-slate-300 text-[11px] flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Errors: 0 validation or parsing errors</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 leading-relaxed space-y-3">
              <p>Upload files or paste JSON to view imported record counts and schema validation logs here.</p>
              <div className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="text-slate-300 font-semibold uppercase">Supported Evidence Types:</div>
                <div>• prep (packaging, polybag, barcode audits)</div>
                <div>• packing (camera scans, weight scales)</div>
                <div>• receiving (dock check-ins, ASN verifies)</div>
                <div>• returns (RMA customer inspections)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
