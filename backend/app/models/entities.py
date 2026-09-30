from sqlalchemy import Column, String, Float, DateTime, Integer, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

class Charge(Base):
    __tablename__ = "charges"

    charge_id = Column(String(100), primary_key=True, index=True)
    shipment_id = Column(String(100), nullable=True, index=True)
    order_id = Column(String(100), nullable=True, index=True)
    sku = Column(String(100), nullable=True, index=True)
    reason = Column(String(255), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    charge_date = Column(DateTime, default=utc_now, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, ASSESSED, etc.

    assessment = relationship("Assessment", back_populates="charge", uselist=False, cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(100), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String(100), nullable=False, index=True)
    order_id = Column(String(100), nullable=True, index=True)
    sku = Column(String(100), nullable=True, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    shipment_date = Column(DateTime, default=datetime.utcnow, nullable=False)


class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(String(100), primary_key=True, index=True)
    evidence_type = Column(String(50), nullable=False, index=True)  # receiving, prep, packing, returns
    shipment_id = Column(String(100), nullable=True, index=True)
    order_id = Column(String(100), nullable=True, index=True)
    sku = Column(String(100), nullable=True, index=True)
    result = Column(String(50), nullable=False)  # PASS, FAIL, VERIFIED, DISCREPANCY, DAMAGED, INTACT, etc.
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String(100), nullable=False)  # e.g., WMS-PrepStation-1, PackScan-02, DockScanner
    reference_data = Column(JSON, nullable=True)  # metadata / reference dictionary


class Assessment(Base):
    __tablename__ = "assessments"

    assessment_id = Column(String(100), primary_key=True, index=True)
    charge_id = Column(String(100), ForeignKey("charges.charge_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    verdict = Column(String(50), nullable=False, index=True)  # SUPPORTED, CONTRADICTED, SILENT
    reason = Column(Text, nullable=False)
    claim_amount = Column(Float, nullable=False, default=0.0)
    evidence_ids = Column(JSON, nullable=False, default=list)  # List[str] of evidence_ids used
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    charge = relationship("Charge", back_populates="assessment")
