import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DashboardMetrics from './components/DashboardMetrics';
import ChargesList from './components/ChargesList';
import ChargeModal from './components/ChargeModal';
import IngestModal from './components/IngestModal';
import {
  fetchSummary,
  fetchCharges,
  fetchChargeDetail,
  fetchChargeEvidence,
  assessCharge,
  assessAllCharges,
  seedDemoData
} from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [summary, setSummary] = useState(null);
  const [charges, setCharges] = useState([]);
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChargeId, setSelectedChargeId] = useState(null);
  const [selectedChargeDetail, setSelectedChargeDetail] = useState(null);
  const [selectedChargeEvidence, setSelectedChargeEvidence] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAssessingAll, setIsAssessingAll] = useState(false);
  const [assessingId, setAssessingId] = useState(null);
  const [showIngestModal, setShowIngestModal] = useState(false);

  // Load summary and charges
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [sumRes, chgRes] = await Promise.all([
        fetchSummary(),
        fetchCharges({ verdict: filterVerdict, search: searchQuery })
      ]);
      setSummary(sumRes);
      setCharges(chgRes);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dispute data from backend');
    } finally {
      setLoading(false);
    }
  }, [filterVerdict, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load details when a charge is selected
  const handleSelectCharge = async (chargeId) => {
    setSelectedChargeId(chargeId);
    try {
      const [detail, ev] = await Promise.all([
        fetchChargeDetail(chargeId),
        fetchChargeEvidence(chargeId)
      ]);
      setSelectedChargeDetail(detail);
      setSelectedChargeEvidence(ev);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseModal = () => {
    setSelectedChargeId(null);
    setSelectedChargeDetail(null);
    setSelectedChargeEvidence(null);
  };

  // Re-run assessment for single charge
  const handleAssessSingle = async (chargeId) => {
    setAssessingId(chargeId);
    try {
      await assessCharge(chargeId);
      // Refresh list, summary, and modal if currently open
      await loadData();
      if (selectedChargeId === chargeId) {
        const [updatedDetail, updatedEv] = await Promise.all([
          fetchChargeDetail(chargeId),
          fetchChargeEvidence(chargeId)
        ]);
        setSelectedChargeDetail(updatedDetail);
        setSelectedChargeEvidence(updatedEv);
      }
    } catch (err) {
      alert(`Assessment failed: ${err.message}`);
    } finally {
      setAssessingId(null);
    }
  };

  // Run assessment across all charges
  const handleAssessAll = async () => {
    setIsAssessingAll(true);
    try {
      await assessAllCharges();
      await loadData();
      if (selectedChargeId) {
        const [updatedDetail, updatedEv] = await Promise.all([
          fetchChargeDetail(selectedChargeId),
          fetchChargeEvidence(selectedChargeId)
        ]);
        setSelectedChargeDetail(updatedDetail);
        setSelectedChargeEvidence(updatedEv);
      }
    } catch (err) {
      alert(`Assess all failed: ${err.message}`);
    } finally {
      setIsAssessingAll(false);
    }
  };

  // Reset & re-seed standard 8-case suite
  const handleSeedDemo = async () => {
    if (!window.confirm('Reset database and load canonical 8 demo cases?')) return;
    setIsSeeding(true);
    try {
      await seedDemoData(true);
      await loadData();
      handleCloseModal();
    } catch (err) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenIngest={() => setShowIngestModal(true)}
        onSeedDemo={handleSeedDemo}
        onAssessAll={handleAssessAll}
        isSeeding={isSeeding}
        isAssessing={isAssessingAll}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={loadData} className="btn btn-secondary btn-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Dashboard Summary Metrics */}
        <DashboardMetrics summary={summary} />

        {/* Charges Table Header & List */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Fulfillment Charges & Penalties</h2>
            <p className="text-xs text-slate-400">Click any row to trace operational evidence and deterministic decision logic</p>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Showing {charges.length} records
          </div>
        </div>

        {loading ? (
          <div className="panel p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm">Connecting to Recovery Engine...</p>
          </div>
        ) : (
          <ChargesList
            charges={charges}
            filterVerdict={filterVerdict}
            onFilterChange={setFilterVerdict}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCharge={handleSelectCharge}
            onAssessCharge={handleAssessSingle}
            assessingId={assessingId}
          />
        )}
      </main>

      {/* Charge Detail Modal */}
      {selectedChargeDetail && (
        <ChargeModal
          charge={selectedChargeDetail}
          evidenceData={selectedChargeEvidence}
          onClose={handleCloseModal}
          onReAssess={handleAssessSingle}
          isAssessing={assessingId === selectedChargeDetail.charge_id}
        />
      )}

      {/* Ingest Modal */}
      {showIngestModal && (
        <IngestModal
          onClose={() => setShowIngestModal(false)}
          onIngestSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
