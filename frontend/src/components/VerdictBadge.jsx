import React from 'react';

export default function VerdictBadge({ verdict, claimAmount = null, currency = 'USD' }) {
  const v = (verdict || 'PENDING').toUpperCase();

  let badgeClass = 'badge-pending';
  let label = 'PENDING';
  let icon = '🟡';

  if (v === 'SUPPORTED') {
    badgeClass = 'badge-supported';
    label = 'SUPPORTED';
    icon = '🟢';
  } else if (v === 'CONTRADICTED') {
    badgeClass = 'badge-contradicted';
    label = 'CONTRADICTED';
    icon = '🔴';
  } else if (v === 'SILENT') {
    badgeClass = 'badge-silent';
    label = 'SILENT';
    icon = '⚪';
  }

  return (
    <span className={`badge ${badgeClass}`} title={`Verdict: ${label}`}>
      <span className="badge-dot" />
      <span>{label}</span>
      {v === 'CONTRADICTED' && claimAmount !== null && claimAmount > 0 && (
        <span className="font-mono ml-1 text-xs opacity-90 font-bold">
          (+${claimAmount.toFixed(2)})
        </span>
      )}
    </span>
  );
}
