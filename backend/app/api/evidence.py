from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models.entities import Charge
from app.schemas.entities import EvidenceResponse
from app.services.resolution import EntityResolutionService
from app.services.evidence import EvidenceRetrievalService

router = APIRouter(prefix="/charges", tags=["Evidence"])

@router.get("/{charge_id}/evidence", response_model=Dict[str, Any])
def get_charge_evidence(charge_id: str, db: Session = Depends(get_db)):
    charge = db.query(Charge).filter(Charge.charge_id == charge_id).first()
    if not charge:
        raise HTTPException(status_code=404, detail=f"Charge '{charge_id}' not found")

    resolution = EntityResolutionService.resolve_charge(db, charge)
    relevant, all_linked = EvidenceRetrievalService.retrieve_evidence_for_charge(db, charge, resolution)

    return {
        "charge_id": charge_id,
        "relevant_evidence": [EvidenceResponse.model_validate(e) for e in relevant],
        "all_linked_evidence": [EvidenceResponse.model_validate(e) for e in all_linked],
        "relevant_count": len(relevant),
        "total_linked_count": len(all_linked),
        "resolution": resolution
    }
