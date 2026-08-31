from fastapi import (
    FastAPI,
    File,
    UploadFile,
    HTTPException
)

from app.inference.classifier import (
    classifier
)

from config import (
    CLASSES,
    IMAGE_SIZE,
    MODEL_VERSION,
    CONFIDENCE_THRESHOLD
)


app = FastAPI(
    title="MediTwin AI Service",
    description="AI biomedical waste classification service",
    version="1.0.0"
)


@app.get("/")
async def root():

    return {

        "service":
            "MediTwin AI Service",

        "status":
            "running",

        "model":
            MODEL_VERSION,

        "classes":
            CLASSES
    }


@app.get("/health")
async def health():

    if (
        classifier.model_loaded
        and classifier.model_trained
    ):

        status = "healthy"

    elif classifier.model_loaded:

        status = "degraded"

    else:

        status = "error"


    return {

        "status":
            status,

        "model_loaded":
            classifier.model_loaded,

        "model_trained":
            classifier.model_trained,

        "model_version":
            (
                classifier.model_version
            ),

        "architecture":
            "mobilenet_v3_small",

        "device":
            str(classifier.device),

        "classes":
            CLASSES,

        "input_size":
            IMAGE_SIZE,

        "metrics":
            None,

        "load_error":
            classifier.load_error
    }


@app.post("/api/v1/predict")
async def predict(
    image: UploadFile = File(...)
):

    if not image.content_type:

        raise HTTPException(
            status_code=400,
            detail="Image type is required"
        )


    if not image.content_type.startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=400,
            detail="Only image files are supported"
        )


    image_bytes = await image.read()


    if not image_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty"
        )


    if not classifier.model_loaded:

        raise HTTPException(
            status_code=503,
            detail="AI model could not be loaded"
        )


    if not classifier.model_trained:

        raise HTTPException(
            status_code=503,
            detail="AI model is not trained yet"
        )


    try:

        result = classifier.predict(
            image_bytes
        )

        return result

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )