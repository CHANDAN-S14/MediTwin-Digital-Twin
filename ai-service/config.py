import os
from pathlib import Path

from dotenv import load_dotenv


# ---------------------------------------------------------
# Base directory
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------
# Server
# ---------------------------------------------------------

AI_HOST = os.getenv(
    "AI_HOST",
    "0.0.0.0"
)

AI_PORT = int(
    os.getenv(
        "PORT",
        os.getenv("AI_PORT", "8000")
    )
)


# ---------------------------------------------------------
# Model
# ---------------------------------------------------------

# Your trained model is located at:
#
# ai-service/model/waste_classifier.pt
#
MODEL_PATH = BASE_DIR / os.getenv(
    "MODEL_PATH",
    "model/waste_classifier.pt"
)


MODEL_VERSION = os.getenv(
    "MODEL_VERSION",
    "mobilenet_v3_small"
)


CONFIDENCE_THRESHOLD = float(
    os.getenv(
        "CONFIDENCE_THRESHOLD",
        "0.75"
    )
)


# ---------------------------------------------------------
# Image
# ---------------------------------------------------------

IMAGE_SIZE = int(
    os.getenv(
        "IMAGE_SIZE",
        "224"
    )
)


# ---------------------------------------------------------
# Classes
# ---------------------------------------------------------

CLASSES = [
    "yellow",
    "red",
    "blue",
    "general"
]