from typing import List, Set, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.entities import Evidence, Charge
from app.schemas.entities import EntityResolutionInfo

class EvidenceRetrievalService:
    @staticmethod
    def get_relevant_evidence_types(reason: str) -> List[str]:
        """
        Determines evidence types relevant to the charge reason.
        Allowed types: 'receiving', 'prep', 'packing', 'returns'
        """
        r = reason.lower()
        types: List[str] = []

        # Packaging / Prep / Barcode / Labeling
        if any(kw in r for kw in ["packag", "prep", "box", "bubble", "bag", "label", "barcode", "upc", "asin"]):
            types.extend(["prep", "packing"])
        
        # Shortage / Quantity / Count / Missing item
        if any(kw in r for kw in ["shortage", "missing", "quantity", "count", "unit", "unreceived", "overage"]):
            types.extend(["packing", "receiving"])

        # Damage
        if any(kw in r for kw in ["damage", "defect", "broken", "crush", "leak"]):
            types.extend(["prep", "packing", "receiving"])

        # Returns
        if any(kw in r for kw in ["return", "rma"]):
            types.extend(["returns"])

        # If none matched specifically, consider all operational evidence types
        if not types:
            types = ["receiving", "prep", "packing", "returns"]

        # Deduplicate preserving order
        seen = set()
        deduped = []
        for t in types:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped

    @staticmethod
    def retrieve_evidence_for_charge(
        db: Session,
        charge: Charge,
        resolution: EntityResolutionInfo
    ) -> Tuple[List[Evidence], List[Evidence]]:
        """
        Retrieves evidence linked to the charge using deterministic entity resolution.
        Returns:
            (relevant_evidence, all_linked_evidence)
            - relevant_evidence: evidence matching the charge reason's domain and SKU
            - all_linked_evidence: all operational evidence matching the shipment/order
        
        Never invents or fabricates evidence.
        """
        shipment_id = resolution.shipment_id
        order_id = resolution.order_id
        sku = resolution.sku

        if not shipment_id and not order_id:
            return [], []

        # Build query for linked records
        clauses = []
        if shipment_id:
            clauses.append(Evidence.shipment_id == shipment_id)
        if order_id:
            clauses.append(Evidence.order_id == order_id)

        query = db.query(Evidence).filter(or_(*clauses))
        records = query.order_by(Evidence.timestamp.asc()).all()

        # Deduplicate records by evidence_id
        seen_ids: Set[str] = set()
        deduped_records: List[Evidence] = []
        for rec in records:
            if rec.evidence_id not in seen_ids:
                seen_ids.add(rec.evidence_id)
                deduped_records.append(rec)

        relevant_types = EvidenceRetrievalService.get_relevant_evidence_types(charge.reason)

        relevant_evidence: List[Evidence] = []
        for rec in deduped_records:
            # Type relevance check
            if rec.evidence_type.lower() not in relevant_types:
                continue

            # SKU check: if evidence specifies a SKU, and charge has a SKU, they must match
            if sku and rec.sku and rec.sku != sku:
                # Evidence is for a different SKU in the same shipment/order -> irrelevant
                continue

            relevant_evidence.append(rec)

        return relevant_evidence, deduped_records
