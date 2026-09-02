import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


# Server
AI_HOST = os.getenv("AI_HOST", "0.0.0.0")

AI_PORT = int(
    os.getenv("PORT", os.getenv("AI_PORT", "8000"))
)


# ============================================================
# MODEL
# ============================================================

# Your actual trained model is:
# ai-service/model/waste_classifier.pt

MODEL_PATH = BASE_DIR / os.getenv(
    "MODEL_PATH",
    "model/waste_classifier.pt"
)


MODEL_VERSION = os.getenv(
    "MODEL_VERSION",
    "waste-mobilenet-v1"
)


CONFIDENCE_THRESHOLD = float(
    os.getenv(
        "CONFIDENCE_THRESHOLD",
        "0.75"
    )
)


IMAGE_SIZE = int(
    os.getenv(
        "IMAGE_SIZE",
        "224"
    )
)


# IMPORTANT:
# This order MUST match classes.json / training.
CLASSES = [
    "yellow",
    "red",
    "blue",
    "general"
]
