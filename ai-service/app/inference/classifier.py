from pathlib import Path

import torch
import torch.nn.functional as F

from torchvision.models import (
    mobilenet_v3_small,
    MobileNet_V3_Small_Weights
)

def resolve_device(requested="auto"):
    requested = str(requested).lower().strip()

    if requested == "cpu":
        return torch.device("cpu")

    if requested == "cuda":
        if torch.cuda.is_available():
            return torch.device("cuda")
        print("CUDA requested but unavailable. Using CPU.")
        return torch.device("cpu")

    # auto
    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


def build_model(
    architecture="mobilenet_v3_small",
    num_classes=None,
    pretrained=True,
):
    if architecture != "mobilenet_v3_small":
        raise ValueError(
            f"Unsupported architecture: {architecture}"
        )

    num_classes = num_classes or len(CLASSES)

    weights = (
        MobileNet_V3_Small_Weights.DEFAULT
        if pretrained
        else None
    )

    model = mobilenet_v3_small(
        weights=weights
    )

    input_features = (
        model.classifier[-1].in_features
    )

    model.classifier[-1] = torch.nn.Linear(
        input_features,
        num_classes
    )

    return model


def head_parameters(
    model,
    architecture="mobilenet_v3_small",
):
    if architecture != "mobilenet_v3_small":
        raise ValueError(
            f"Unsupported architecture: {architecture}"
        )

    return model.classifier[-1].parameters()

from app.preprocessing.preprocess import (
    preprocess_image
)

from config import (
    CLASSES,
    MODEL_PATH,
    MODEL_VERSION,
    CONFIDENCE_THRESHOLD
)


DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


class WasteClassifier:

    def __init__(self):

        self.model = None

        self.model_loaded = False

        self.model_trained = False

        self.load_error = None

        self.model_version = MODEL_VERSION

        self.device = DEVICE

        self._load_model()


    def _create_model(self):

        model = mobilenet_v3_small(
            weights=None
        )

        input_features = (
            model.classifier[-1].in_features
        )

        model.classifier[-1] = torch.nn.Linear(
            input_features,
            len(CLASSES)
        )

        return model


    def _load_model(self):

        try:

            self.model = self._create_model()

            if not Path(MODEL_PATH).exists():

                self.model_loaded = True

                self.model_trained = False

                self.load_error = None

                self.model.to(self.device)

                self.model.eval()

                return


            checkpoint = torch.load(
                MODEL_PATH,
                map_location=self.device
            )

            if isinstance(
                checkpoint,
                dict
            ) and "model_state_dict" in checkpoint:

                self.model.load_state_dict(
                    checkpoint["model_state_dict"]
                )

                self.model_version = checkpoint.get(
                    "model_version",
                    MODEL_VERSION
                )

            else:

                self.model.load_state_dict(
                    checkpoint
                )


            self.model.to(self.device)

            self.model.eval()

            self.model_loaded = True

            self.model_trained = True

        except Exception as error:

            self.model_loaded = False

            self.model_trained = False

            self.load_error = str(error)


    def predict(
        self,
        image_bytes: bytes
    ):

        if not self.model_loaded:

            raise RuntimeError(
                "Model failed to load"
            )


        if not self.model_trained:

            raise RuntimeError(
                "Model is not trained"
            )


        image = preprocess_image(
            image_bytes
        )

        image = image.to(
            self.device
        )


        with torch.no_grad():

            output = self.model(
                image
            )

            probabilities = F.softmax(
                output,
                dim=1
            )[0]


        values, indices = torch.topk(
            probabilities,
            k=min(
                len(CLASSES),
                3
            )
        )


        prediction_index = (
            int(indices[0].item())
        )

        prediction = (
            CLASSES[prediction_index]
        )

        confidence = float(
            values[0].item()
        )


        alternatives = []

        for value, index in zip(
            values[1:],
            indices[1:]
        ):

            alternatives.append({

                "category":
                    CLASSES[
                        int(index.item())
                    ],

                "confidence":
                    round(
                        float(value.item()),
                        4
                    )
            })


        compartment = (
            self.get_compartment(
                prediction
            )
        )


        needs_review = (
            confidence <
            CONFIDENCE_THRESHOLD
        )


        return {

            "prediction":
                prediction,

            "confidence":
                round(
                    confidence,
                    4
                ),

            "alternatives":
                alternatives,

            "compartment":
                compartment,

            "model_version":
                self.model_version,

            "needs_review":
                needs_review
        }


    @staticmethod
    def get_compartment(
        category: str
    ):

        slots = {

            "yellow":
                "YELLOW-01",

            "red":
                "RED-02",

            "blue":
                "BLUE-01",

            "general":
                "GENERAL-01"
        }

        return slots.get(
            category,
            "GENERAL-01"
        )


classifier = WasteClassifier()