"""
Response schemas.

These are declared explicitly rather than returning bare dicts so the field names
are pinned in one place. The Node API reads `prediction`, `confidence`,
`alternatives`, `compartment`, `model_version` and `untrained` by name; a typo in
any of them would surface as a mystery classification failure at the far end of
the stack, so the contract is written down where FastAPI can enforce it and
publish it as OpenAPI.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class CategoryScore(BaseModel):
    category: str = Field(..., description="One of the four waste categories")
    confidence: float = Field(..., ge=0.0, le=1.0)


class PredictionResponse(BaseModel):
    prediction: str = Field(..., description="Highest-scoring category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Softmax probability of the winner")
    label: str = Field(..., description="Human-readable category with its required treatment")
    alternatives: list[CategoryScore] = Field(
        default_factory=list,
        description="The remaining categories, highest first. Present so a reviewer can see how close the call was.",
    )
    all_scores: dict[str, float] = Field(
        default_factory=dict, description="Every category with its probability, for charting"
    )
    entropy: float = Field(
        ..., ge=0.0, le=1.0,
        description="Normalised uncertainty across all classes. 0 is decisive, 1 is a four-way tie.",
    )
    compartment: str = Field(..., description="Compartment slot this category belongs in, e.g. RED-02")
    model_version: str
    untrained: bool = Field(
        ...,
        description=(
            "True when no trained checkpoint is loaded. The numbers above are then "
            "the output of a random classification head and carry no information. "
            "Callers must not act on a result with this flag set."
        ),
    )
    warning: str | None = Field(
        None, description="Present when something about this result needs a human's attention"
    )
    inference_ms: int = Field(..., description="Server-side time spent on this prediction")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_trained: bool
    model_version: str
    architecture: str
    device: str
    classes: list[str]
    input_size: int
    metrics: dict | None = None
    load_error: str | None = None


class CategoryInfo(BaseModel):
    category: str
    label: str
    compartment: str
    index: int = Field(..., description="Position in the model's output vector")


class ErrorResponse(BaseModel):
    detail: str
