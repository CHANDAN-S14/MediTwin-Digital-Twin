from pathlib import Path

import torch
import torch.nn.functional as F

from torchvision.models import mobilenet_v3_small

from app.preprocessing.preprocess import preprocess_image

from config import (
    CLASSES,
    MODEL_PATH,
    MODEL_VERSION,
    CONFIDENCE_THRESHOLD
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# MODEL CREATION
# ============================================================

def build_model():

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


# ============================================================
# CLASSIFIER
# ============================================================

class WasteClassifier:

    def __init__(self):

        self.model = None

        self.model_loaded = False

        self.model_trained = False

        self.load_error = None

        self.model_version = MODEL_VERSION

        self.device = DEVICE

        self._load_model()


    # ========================================================
    # LOAD MODEL
    # ========================================================

    def _load_model(self):

        try:

            print("====================================")
            print("Loading MediTwin AI model")
            print("====================================")

            print(
                f"Model path: {MODEL_PATH}"
            )

            print(
                f"Model exists: {Path(MODEL_PATH).exists()}"
            )

            print(
                f"Device: {self.device}"
            )


            # -----------------------------------------------
            # Check model file
            # -----------------------------------------------

            if not Path(MODEL_PATH).exists():

                raise FileNotFoundError(
                    f"Model file not found: {MODEL_PATH}"
                )


            # -----------------------------------------------
            # Create model architecture
            # -----------------------------------------------

            self.model = build_model()


            # -----------------------------------------------
            # Load checkpoint
            # -----------------------------------------------

            checkpoint = torch.load(
                MODEL_PATH,
                map_location=self.device
            )


            print(
                f"Checkpoint type: {type(checkpoint)}"
            )


            # =================================================
            # IMPORTANT
            # Your training script saved:
            #
            # {
            #     "state_dict": ...,
            #     "classes": ...,
            #     "architecture": ...,
            #     "model_version": ...,
            #     ...
            # }
            #
            # Therefore we must extract checkpoint["state_dict"]
            # =================================================

            if isinstance(checkpoint, dict):

                if "state_dict" in checkpoint:

                    state_dict = checkpoint["state_dict"]

                    print(
                        "Found checkpoint['state_dict']"
                    )

                    self.model_version = checkpoint.get(
                        "model_version",
                        MODEL_VERSION
                    )

                elif "model_state_dict" in checkpoint:

                    # Support older checkpoint format

                    state_dict = checkpoint[
                        "model_state_dict"
                    ]

                    print(
                        "Found checkpoint['model_state_dict']"
                    )

                    self.model_version = checkpoint.get(
                        "model_version",
                        MODEL_VERSION
                    )

                else:

                    # Assume checkpoint itself is state_dict

                    state_dict = checkpoint

            else:

                raise RuntimeError(
                    "Invalid model checkpoint format"
                )


            # -----------------------------------------------
            # Validate classes if checkpoint contains them
            # -----------------------------------------------

            if isinstance(checkpoint, dict):

                checkpoint_classes = checkpoint.get(
                    "classes"
                )

                if checkpoint_classes:

                    if list(checkpoint_classes) != list(CLASSES):

                        raise RuntimeError(
                            "Class order mismatch.\n"
                            f"Model classes: {checkpoint_classes}\n"
                            f"Service classes: {CLASSES}"
                        )


            # -----------------------------------------------
            # Load weights
            # -----------------------------------------------

            self.model.load_state_dict(
                state_dict,
                strict=True
            )


            # -----------------------------------------------
            # Move to device
            # -----------------------------------------------

            self.model.to(
                self.device
            )

            self.model.eval()


            # -----------------------------------------------
            # Success
            # -----------------------------------------------

            self.model_loaded = True

            self.model_trained = True

            self.load_error = None


            print("====================================")
            print("MODEL LOADED SUCCESSFULLY")
            print(f"Version: {self.model_version}")
            print(f"Classes: {CLASSES}")
            print("====================================")


        except Exception as error:

            self.model_loaded = False

            self.model_trained = False

            self.load_error = str(error)

            print("====================================")
            print("MODEL LOAD FAILED")
            print(str(error))
            print("====================================")


    # ========================================================
    # PREDICT
    # ========================================================

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


        # -----------------------------------------------
        # Preprocess
        # -----------------------------------------------

        image = preprocess_image(
            image_bytes
        )


        image = image.to(
            self.device
        )


        # -----------------------------------------------
        # Prediction
        # -----------------------------------------------

        with torch.no_grad():

            output = self.model(
                image
            )

            probabilities = F.softmax(
                output,
                dim=1
            )[0]


        # -----------------------------------------------
        # Top 3
        # -----------------------------------------------

        values, indices = torch.topk(
            probabilities,
            k=min(
                len(CLASSES),
                3
            )
        )


        prediction_index = int(
            indices[0].item()
        )


        prediction = CLASSES[
            prediction_index
        ]


        confidence = float(
            values[0].item()
        )


        # -----------------------------------------------
        # Alternatives
        # -----------------------------------------------

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


        # -----------------------------------------------
        # Compartment
        # -----------------------------------------------

        compartment = self.get_compartment(
            prediction
        )


        # -----------------------------------------------
        # Confidence check
        # -----------------------------------------------

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


    # ========================================================
    # COMPARTMENT
    # ========================================================

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


# ============================================================
# GLOBAL CLASSIFIER
# ============================================================

classifier = WasteClassifier()
