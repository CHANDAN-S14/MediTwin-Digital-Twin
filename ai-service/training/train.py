from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import DataLoader

from torchvision import datasets
from torchvision import transforms
from torchvision.models import (
    mobilenet_v3_small,
    MobileNet_V3_Small_Weights
)


BASE_DIR = Path(__file__).resolve().parents[1]

TRAIN_DIR = BASE_DIR / "data" / "train"

VAL_DIR = BASE_DIR / "data" / "validation"

MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(
    exist_ok=True
)


CLASSES = [
    "yellow",
    "red",
    "blue",
    "general"
]


IMAGE_SIZE = 224

BATCH_SIZE = 16

EPOCHS = 10

LEARNING_RATE = 0.0001


device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


train_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(),

    transforms.RandomRotation(10),

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


val_transform = transforms.Compose([

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


train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transform
)


val_dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=val_transform
)


print(
    "Detected classes:",
    train_dataset.classes
)


train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)


val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)


model = mobilenet_v3_small(
    weights=MobileNet_V3_Small_Weights.DEFAULT
)


input_features = (
    model.classifier[-1].in_features
)


model.classifier[-1] = nn.Linear(
    input_features,
    len(CLASSES)
)


model = model.to(device)


criterion = nn.CrossEntropyLoss()


optimizer = optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE
)


best_accuracy = 0.0


for epoch in range(EPOCHS):

    model.train()

    running_loss = 0.0

    correct = 0

    total = 0


    for images, labels in train_loader:

        images = images.to(device)

        labels = labels.to(device)


        optimizer.zero_grad()


        outputs = model(images)


        loss = criterion(
            outputs,
            labels
        )


        loss.backward()

        optimizer.step()


        running_loss += (
            loss.item()
            * images.size(0)
        )


        _, predicted = torch.max(
            outputs,
            1
        )


        total += labels.size(0)

        correct += (
            predicted == labels
        ).sum().item()


    train_accuracy = (
        correct / total
        if total
        else 0
    )


    model.eval()

    val_correct = 0

    val_total = 0


    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            labels = labels.to(device)


            outputs = model(images)


            _, predicted = torch.max(
                outputs,
                1
            )


            val_total += labels.size(0)

            val_correct += (
                predicted == labels
            ).sum().item()


    val_accuracy = (
        val_correct / val_total
        if val_total
        else 0
    )


    print(
        f"Epoch {epoch + 1}/{EPOCHS} "
        f"Loss: {running_loss / max(total, 1):.4f} "
        f"Train: {train_accuracy:.2%} "
        f"Val: {val_accuracy:.2%}"
    )


    if val_accuracy > best_accuracy:

        best_accuracy = val_accuracy


        checkpoint = {

            "model_state_dict":
                model.state_dict(),

            "model_version":
                "waste-mobilenet-v1",

            "classes":
                CLASSES,

            "architecture":
                "mobilenet_v3_small",

            "input_size":
                IMAGE_SIZE,

            "validation_accuracy":
                val_accuracy
        }


        torch.save(
            checkpoint,
            MODEL_DIR /
            "waste_classifier.pth"
        )


        print(
            "Saved best model."
        )


print(
    f"Training complete. "
    f"Best validation accuracy: "
    f"{best_accuracy:.2%}"
)