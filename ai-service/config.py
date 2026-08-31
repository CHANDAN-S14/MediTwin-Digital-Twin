import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


AI_HOST = os.getenv("AI_HOST", "127.0.0.1")

AI_PORT = int(
    os.getenv("AI_PORT", "8000")
)


MODEL_PATH = BASE_DIR / os.getenv(
    "MODEL_PATH",
    "models/waste_classifier.pth"
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


CLASSES = [
    "yellow",
    "red",
    "blue",
    "general"
]