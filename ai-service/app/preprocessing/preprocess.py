from io import BytesIO

from PIL import Image

import torch
from torchvision import transforms

from config import IMAGE_SIZE


# ------------------------------------------------------------
# Training transform
# ------------------------------------------------------------

train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ------------------------------------------------------------
# Validation / evaluation transform
# ------------------------------------------------------------

eval_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ------------------------------------------------------------
# Inference preprocessing
# ------------------------------------------------------------

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """
    Convert uploaded image bytes into a tensor suitable
    for the trained MobileNetV3 model.
    """

    image = Image.open(
        BytesIO(image_bytes)
    ).convert("RGB")

    tensor = eval_transform(image)

    return tensor.unsqueeze(0)