# MediTwin Classification Service

A FastAPI process that takes a photograph of a discarded item and names the waste
category it belongs to under the Bio-Medical Waste Management Rules 2016 (India)
colour code: yellow, red, blue, or general.

It runs separately from the Node API. Inference is CPU-bound and bursty, model
weights are large, and retraining should not mean redeploying the dashboard.
Separation also contains failure — if this process hangs or dies, the Node side
treats it as a known state and the rest of the platform keeps working.

> **This is a prototype classifier.** It is advisory only, is not validated for
> clinical use, and does not certify regulatory compliance. Low-confidence
> predictions are routed to a human by design, and the API refuses to dispatch a
> robot on one.

## Running it

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate

# CPU-only torch first, unless you have an NVIDIA GPU and want the CUDA build.
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

cp .env.example .env
python main.py            # or: uvicorn main:app --reload --port 8000
```

Interactive docs at <http://127.0.0.1:8000/docs>.

## It starts without a trained model, on purpose

A fresh clone has no `model/waste_classifier.pt`, and the service starts anyway so
the rest of the stack can be developed against it. What it does **not** do is
pretend to work:

```
GET /health  →  { "status": "degraded", "model_loaded": true, "model_trained": false, … }
POST /api/v1/predict  →  { …, "untrained": true, "warning": "No trained checkpoint is loaded…" }
```

`model_loaded` and `model_trained` are separate fields because they come apart in
exactly this case — the network exists, so it produces a softmax, and one of the
four numbers is largest. Those numbers are the output of a randomly initialised
head and carry no information about the image. The Node API reads `untrained` and
turns any such result into a 503 rather than writing it to the waste register.

## Training

Collect images into one directory per category, named exactly as in
`model/classes.json`:

```
data/waste/
    yellow/   img001.jpg  …
    red/      …
    blue/     …
    general/  …
```

Use safe, representative objects — clean gauze and packaging for yellow, an
unused IV set for red, an empty glass vial for blue, ordinary packaging for
general. Do not photograph real clinical waste to build a demo dataset.

```bash
python model/train.py --data-dir data/waste --epochs 12
```

Training runs in two phases: the backbone is frozen while the new four-way head
learns, then the whole network is fine-tuned at a much lower learning rate. Going
straight to full fine-tuning lets the large gradients from a random head flow back
and damage the pretrained features that made transfer learning worth doing.

The script prints a confusion matrix and per-class precision and recall. Read the
recall column, not the accuracy figure: missing a blue sharps item is a laceration
risk, while over-calling general as yellow only costs money on incineration. Those
errors are not interchangeable.

Restart the service afterwards to pick up the checkpoint.

## The class order is a contract

`model/classes.json` fixes the order `["yellow", "red", "blue", "general"]`, and
index 0 must mean yellow in both training and serving, permanently.

This is not pedantry. `torchvision.datasets.ImageFolder` assigns indices
*alphabetically* — `blue=0, general=1, red=2, yellow=3` — which is a different
order. Train against that and serve against `classes.json` and every prediction is
relabelled: blue reads as yellow, red reads as blue, and sharps get binned as
general waste. Nothing raises an error, validation accuracy looks excellent, and
the fault appears only in the physical bins.

Two guards prevent it. `train.py` remaps `ImageFolder`'s alphabetical index onto
the canonical one and records the canonical order in the checkpoint;
`classifier.py` refuses to load a checkpoint whose recorded order disagrees with
`classes.json`, reporting the mismatch through `/health` as `load_error` instead of
serving mislabelled predictions.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/predict` | Multipart, field name `image`. Returns the winning category, its confidence, every alternative with its score, normalised entropy, and the compartment slot. |
| `GET /health` | Liveness plus real model state: loaded, trained, version, architecture, device, and any load error. |
| `GET /api/v1/categories` | The colour code, with each category's index in the model's output vector. |

Every response includes all four scores rather than only the winner, because a
reviewer deciding whether to trust a 0.61 needs to know whether the runner-up was
0.37 or 0.03. Those are very different situations and only one deserves a second
look.

## Layout

```
main.py                          FastAPI app, routes, upload limits
app/config.py                    deployment settings; class contract read from classes.json
app/schemas.py                   response models, so field names are pinned in one place
app/preprocessing/preprocess.py  transforms, shared by training and inference
app/inference/classifier.py      model construction, checkpoint loading, prediction
model/classes.json               class order, input size, normalisation, labels
model/train.py                   two-phase transfer learning
```

`preprocess.py` is imported by both training and serving deliberately. If the two
paths normalised pixels differently the model would still return confident-looking
numbers, they would just be wrong — nothing crashes, accuracy quietly collapses,
and it looks like a bad model rather than a preprocessing mismatch.
