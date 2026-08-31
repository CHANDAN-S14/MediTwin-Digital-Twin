from io import BytesIO

from PIL import Image

import torch

from torchvision import transforms


IMAGE_SIZE = 224


transform = transforms.Compose([
    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


def preprocess_image(
    image_bytes: bytes
) -> torch.Tensor:

    image = Image.open(
        BytesIO(image_bytes)
    ).convert("RGB")

    tensor = transform(image)

    tensor = tensor.unsqueeze(0)

    return tensor