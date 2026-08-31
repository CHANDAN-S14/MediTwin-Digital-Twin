"""
Configuration for the classification service.

Everything the model needs to be reproducible lives in model/classes.json rather
than in this file, because those values (class order, input size, normalisation)
must be identical between training and inference. Config here is deployment
concerns only: where to listen, where the weights are, how big an upload to accept.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "model"
CLASSES_FILE = MODEL_DIR / "classes.json"


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer, got {raw!r}") from exc


def _load_class_spec() -> dict:
    """
    Reads the class contract. A missing or malformed classes.json is fatal at
    import time rather than at first request: a service that starts up and then
    fails on every prediction is harder to diagnose than one that never starts.
    """
    if not CLASSES_FILE.exists():
        raise FileNotFoundError(
            f"{CLASSES_FILE} is missing. It defines the class order every prediction "
            "depends on and cannot be guessed."
        )
    spec = json.loads(CLASSES_FILE.read_text(encoding="utf-8"))
    classes = spec.get("classes")
    if not isinstance(classes, list) or not classes:
        raise ValueError(f"{CLASSES_FILE} has no 'classes' list")
    if len(set(classes)) != len(classes):
        raise ValueError(f"{CLASSES_FILE} lists a duplicate class: {classes}")
    return spec


_SPEC = _load_class_spec()


@dataclass(frozen=True)
class Settings:
    # --- Serving ---------------------------------------------------------
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = _int("PORT", 8000)
    log_level: str = os.getenv("LOG_LEVEL", "info")
    # Comma-separated; the Node API is the only expected caller in development.
    cors_origins: tuple[str, ...] = tuple(
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000").split(",")
        if o.strip()
    )

    # --- Model -----------------------------------------------------------
    weights_path: Path = Path(os.getenv("WEIGHTS_PATH", str(MODEL_DIR / "waste_classifier.pt")))
    # mobilenet_v3_small is the default because this is meant to run on a robot's
    # companion board, not a datacentre GPU. efficientnet_b0 is the accuracy
    # trade-up; both are supported by train.py and the classifier.
    architecture: str = os.getenv("ARCHITECTURE", "mobilenet_v3_small")
    device: str = os.getenv("DEVICE", "auto")

    # --- Uploads ---------------------------------------------------------
    max_upload_bytes: int = _int("MAX_UPLOAD_MB", 10) * 1024 * 1024

    # --- Class contract (from classes.json, not the environment) ---------
    classes: tuple[str, ...] = tuple(_SPEC["classes"])
    input_size: int = int(_SPEC.get("input_size", 224))
    norm_mean: tuple[float, ...] = tuple(_SPEC["normalization"]["mean"])
    norm_std: tuple[float, ...] = tuple(_SPEC["normalization"]["std"])
    labels: dict = field(default_factory=lambda: dict(_SPEC.get("labels", {})))
    fallback_model_version: str = str(_SPEC.get("model_version", "unknown"))

    @property
    def num_classes(self) -> int:
        return len(self.classes)


settings = Settings()

# ---------------------------------------------------------------------------
# Which compartment slot each category maps to.
#
# Duplicated from the Node service deliberately: this is the regulatory colour
# code from the Bio-Medical Waste Management Rules 2016 (India), and both
# processes need it even when the other is down. It is small, stable, and
# legally defined — the kind of constant that should be stated twice rather
# than fetched over a network at inference time.
# ---------------------------------------------------------------------------
COMPARTMENT_SLOT = {
    "yellow": "YELLOW-01",
    "red": "RED-02",
    "blue": "BLUE-01",
    "general": "GENERAL-01",
}


def compartment_for(category: str) -> str:
    return COMPARTMENT_SLOT.get(category, COMPARTMENT_SLOT["general"])
