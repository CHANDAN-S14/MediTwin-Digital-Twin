from typing import List, Optional

from pydantic import BaseModel


class Alternative(BaseModel):
    category: str
    confidence: float


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    alternatives: List[Alternative]
    compartment: str
    model_version: str
    needs_review: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_trained: bool
    model_version: str
    architecture: str
    device: str
    classes: List[str]
    input_size: int
    metrics: Optional[dict] = None
    load_error: Optional[str] = None