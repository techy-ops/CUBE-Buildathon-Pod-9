const API_BASE = '/api';

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard summary: ${res.statusText}`);
  return res.json();
}

export async function fetchCharges(params = {}) {
  const query = new URLSearchParams();
  if (params.verdict && params.verdict !== 'ALL') {
    query.set('verdict', params.verdict);
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.reason) {
    query.set('reason', params.reason);
  }

  const url = `${API_BASE}/charges${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch charges: ${res.statusText}`);
  return res.json();
}

export async function fetchChargeDetail(chargeId) {
  const res = await fetch(`${API_BASE}/charges/${encodeURIComponent(chargeId)}`);
  if (!res.ok) throw new Error(`Failed to fetch charge detail: ${res.statusText}`);
  return res.json();
}

export async function fetchChargeEvidence(chargeId) {
  const res = await fetch(`${API_BASE}/charges/${encodeURIComponent(chargeId)}/evidence`);
  if (!res.ok) throw new Error(`Failed to fetch charge evidence: ${res.statusText}`);
  return res.json();
}

export async function assessCharge(chargeId) {
  const res = await fetch(`${API_BASE}/charges/${encodeURIComponent(chargeId)}/assess`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to assess charge: ${res.statusText}`);
  return res.json();
}

export async function assessAllCharges() {
  const res = await fetch(`${API_BASE}/charges/assess-all`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to assess all charges: ${res.statusText}`);
  return res.json();
}

export async function seedDemoData(runAssessments = true) {
  const res = await fetch(`${API_BASE}/demo/seed?run_assessments=${runAssessments}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to seed demo data: ${res.statusText}`);
  return res.json();
}

export async function ingestJson(payload) {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Ingestion failed');
  }
  return res.json();
}

export async function ingestFile(formData) {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'File ingestion failed');
  }
  return res.json();
}
