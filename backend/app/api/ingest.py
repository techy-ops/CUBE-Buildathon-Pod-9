from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import json

from app.database import get_db
from app.schemas.entities import IngestPayload, IngestResult
from app.services.ingestion import IngestionService
from app.services.seed_data import seed_database

router = APIRouter(prefix="", tags=["Ingestion"])

@router.post("/ingest", response_model=IngestResult)
async def ingest_data(
    payload: Optional[IngestPayload] = None,
    file: Optional[UploadFile] = File(None),
    record_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Ingests operational / financial records via JSON body or uploaded CSV/JSON file.
    Validates input using Pydantic and returns structured error reports rather than crashing.
    """
    if file:
        content = await file.read()
        filename = file.filename.lower()
        if filename.endswith(".json"):
            try:
                data = json.loads(content.decode("utf-8"))
                return IngestionService.ingest_dict(db, data)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid JSON file format: {str(e)}")
        elif filename.endswith(".csv"):
            if not record_type:
                raise HTTPException(
                    status_code=400,
                    detail="record_type (charges, orders, shipments, evidence) is required when uploading CSV"
                )
            rt = record_type.strip().lower()
            if rt not in {"charges", "orders", "shipments", "evidence"}:
                raise HTTPException(
                    status_code=400,
                    detail="record_type must be one of: charges, orders, shipments, evidence"
                )
            try:
                return IngestionService.ingest_csv_content(db, rt, content.decode("utf-8"))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed parsing CSV: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Uploaded file must be .json or .csv")

    if payload:
        return IngestionService.ingest_dict(db, payload.model_dump())

    raise HTTPException(status_code=400, detail="Provide either a JSON payload or a file upload")

@router.post("/demo/seed", response_model=Dict[str, Any])
def seed_demo_data(
    run_assessments: bool = True,
    db: Session = Depends(get_db)
):
    """
    Clears tables and loads the comprehensive sample dataset covering all 8 required cases.
    Optionally evaluates assessments immediately for all records.
    """
    return seed_database(db, run_assessments=run_assessments)
