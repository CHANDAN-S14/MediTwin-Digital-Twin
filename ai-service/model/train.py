#!/usr/bin/env python
"""
Trains the waste classifier.

Usage
-----
    python model/train.py --data-dir data/waste --epochs 12

Expected dataset layout — one directory per category, named exactly as in
classes.json:

    data/waste/
        yellow/   img001.jpg  img002.jpg  …
        red/      …
        blue/     …
        general/  …

Collect the images yourself with safe, representative objects: clean gauze and
packaging for yellow, intact tubing and an unused IV set for red, an empty glass
vial for blue, ordinary packaging for general. Do not photograph real clinical
waste to build a demo dataset.

Approach
--------
Transfer learning in two phases. First the backbone is frozen and only the new
four-way head is trained, which converges in a couple of epochs because the head
is the only thing that does not already know what it is looking at. Then the whole
network is unfrozen and fine-tuned at a much lower learning rate. Going straight
to full fine-tuning with a randomly initialised head is the common mistake: the
large early gradients from that random layer flow back and damage precisely the
pretrained features that made the transfer worth doing.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision.datasets import ImageFolder

# Import from the app package so training and serving share one definition of
# every transform and of the model architecture.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.inference.classifier import build_model, head_parameters, resolve_device  # noqa: E402
from app.preprocessing.preprocess import eval_transform, train_transform  # noqa: E402

CLASSES = list(settings.classes)


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

def build_dataset(data_dir: Path):
    """
    Loads the dataset and forces it onto our canonical class order.

    This function exists because of one specific, silent bug. ImageFolder assigns
    indices alphabetically, which for these four categories gives

        blue=0, general=1, red=2, yellow=3

    while classes.json declares

        yellow=0, red=1, blue=2, general=3

    Train against ImageFolder's order and serve against classes.json's, and the
    model is perfectly accurate at predicting an index that the service then reads
    as a completely different colour. Sharps get labelled general. Nothing throws,
    accuracy on the validation set looks excellent, and the fault only appears in
    the physical bins.

    So the alphabetical index is remapped to the canonical one here, and the
    canonical order is written into the checkpoint for the classifier to verify.
    """
    if not data_dir.exists():
        raise SystemExit(f"No dataset at {data_dir}. See the docstring for the expected layout.")

    probe = ImageFolder(str(data_dir))
    found = list(probe.classes)

    missing = [c for c in CLASSES if c not in found]
    if missing:
        raise SystemExit(
            f"Dataset is missing a directory for: {', '.join(missing)}.\n"
            f"Found: {', '.join(found) or '(nothing)'}\n"
            "Every category needs examples — a model cannot learn a class it has never seen."
        )
    extra = [c for c in found if c not in CLASSES]
    if extra:
        raise SystemExit(
            f"Dataset has unexpected directories: {', '.join(extra)}. "
            f"Only {', '.join(CLASSES)} are valid categories."
        )

    # alphabetical index -> canonical index
    remap = {probe.class_to_idx[name]: CLASSES.index(name) for name in CLASSES}
    print("  class index remap (ImageFolder -> canonical):")
    for name in CLASSES:
        print(f"    {name:<8} {probe.class_to_idx[name]} -> {CLASSES.index(name)}")

    def target_transform(index: int) -> int:
        return remap[index]

    train_ds = ImageFolder(str(data_dir), transform=train_transform(), target_transform=target_transform)
    eval_ds = ImageFolder(str(data_dir), transform=eval_transform(), target_transform=target_transform)
    return train_ds, eval_ds


def split_indices(dataset: ImageFolder, val_fraction: float, seed: int) -> tuple[list[int], list[int]]:
    """
    Stratified split, so every category appears in both halves.

    A plain random split on a small imbalanced dataset can leave a rare class with
    zero validation examples, which makes its recall undefined and the overall
    accuracy figure quietly misleading.
    """
    generator = torch.Generator().manual_seed(seed)
    by_class: dict[int, list[int]] = {}
    for idx, (_, target) in enumerate(dataset.samples):
        by_class.setdefault(target, []).append(idx)

    train_idx: list[int] = []
    val_idx: list[int] = []
    for target, indices in sorted(by_class.items()):
        order = torch.randperm(len(indices), generator=generator).tolist()
        shuffled = [indices[i] for i in order]
        n_val = max(1, int(round(len(shuffled) * val_fraction))) if len(shuffled) > 1 else 0
        val_idx.extend(shuffled[:n_val])
        train_idx.extend(shuffled[n_val:])
    return train_idx, val_idx


# ---------------------------------------------------------------------------
# Train / evaluate
# ---------------------------------------------------------------------------

def run_epoch(model, loader, criterion, optimiser, device, train: bool) -> tuple[float, float]:
    model.train() if train else model.eval()
    total_loss = 0.0
    correct = 0
    seen = 0

    context = torch.enable_grad() if train else torch.inference_mode()
    with context:
        for images, targets in loader:
            images, targets = images.to(device), targets.to(device)

            if train:
                optimiser.zero_grad(set_to_none=True)

            outputs = model(images)
            loss = criterion(outputs, targets)

            if train:
                loss.backward()
                optimiser.step()

            total_loss += loss.item() * targets.size(0)
            correct += (outputs.argmax(1) == targets).sum().item()
            seen += targets.size(0)

    return total_loss / max(seen, 1), correct / max(seen, 1)


def confusion(model, loader, device, n_classes: int) -> torch.Tensor:
    model.eval()
    matrix = torch.zeros(n_classes, n_classes, dtype=torch.long)
    with torch.inference_mode():
        for images, targets in loader:
            predictions = model(images.to(device)).argmax(1).cpu()
            for actual, predicted in zip(targets, predictions):
                matrix[actual.item(), predicted.item()] += 1
    return matrix


def report(matrix: torch.Tensor) -> dict:
    """
    Per-class precision and recall, printed as a confusion matrix.

    Overall accuracy is close to useless here. Missing a blue sharps item is a
    laceration risk; over-calling general as yellow just costs money on
    incineration. Those errors are not interchangeable, so the per-class recall
    is the number that actually matters and it gets printed on its own.
    """
    print("\n  Confusion matrix (rows = actual, columns = predicted)")
    header = "           " + "".join(f"{c[:7]:>9}" for c in CLASSES)
    print(header)
    for i, name in enumerate(CLASSES):
        row = "".join(f"{int(matrix[i, j]):>9}" for j in range(len(CLASSES)))
        print(f"    {name:<7}{row}")

    metrics: dict[str, dict[str, float]] = {}
    print("\n  Per-class performance")
    print("           precision   recall   support")
    for i, name in enumerate(CLASSES):
        tp = int(matrix[i, i])
        predicted = int(matrix[:, i].sum())
        actual = int(matrix[i, :].sum())
        precision = tp / predicted if predicted else 0.0
        recall = tp / actual if actual else 0.0
        metrics[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "support": actual,
        }
        print(f"    {name:<9}{precision:>9.3f}{recall:>9.3f}{actual:>10}")

    total = int(matrix.sum())
    accuracy = int(matrix.diag().sum()) / total if total else 0.0
    print(f"\n  Overall accuracy: {accuracy:.3f} on {total} validation images")

    weakest = min(metrics.items(), key=lambda kv: kv[1]["recall"])
    if weakest[1]["recall"] < 0.85:
        print(
            f"\n  Note: recall on '{weakest[0]}' is {weakest[1]['recall']:.2f}. "
            f"Roughly {(1 - weakest[1]['recall']) * 100:.0f}% of real {weakest[0]} items would be\n"
            f"  mis-binned. Add more {weakest[0]} examples before trusting this checkpoint."
        )

    return {"accuracy": round(accuracy, 4), "per_class": metrics, "val_images": total}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train the MediTwin waste classifier")
    parser.add_argument("--data-dir", type=Path, default=Path("data/waste"))
    parser.add_argument("--out", type=Path, default=Path(settings.weights_path))
    parser.add_argument("--architecture", default=settings.architecture)
    parser.add_argument("--epochs", type=int, default=12, help="Fine-tuning epochs, after the head warm-up")
    parser.add_argument("--head-epochs", type=int, default=3, help="Frozen-backbone warm-up epochs")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4, help="Head learning rate")
    parser.add_argument("--fine-tune-lr", type=float, default=3e-5, help="Whole-network learning rate")
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", default=settings.device)
    args = parser.parse_args()

    torch.manual_seed(args.seed)

    device = resolve_device(args.device)
    print(f"\nMediTwin classifier training")
    print(f"  device        {device}")
    print(f"  architecture  {args.architecture}")
    print(f"  classes       {', '.join(CLASSES)}")

    train_ds, eval_ds = build_dataset(args.data_dir)
    train_idx, val_idx = split_indices(eval_ds, args.val_fraction, args.seed)

    counts = Counter(target for _, target in eval_ds.samples)
    print(f"\n  {len(eval_ds.samples)} images: " + ", ".join(
        f"{CLASSES[i]} {counts.get(i, 0)}" for i in range(len(CLASSES))
    ))
    print(f"  split: {len(train_idx)} train / {len(val_idx)} validation")

    thin = [CLASSES[i] for i in range(len(CLASSES)) if counts.get(i, 0) < 25]
    if thin:
        print(
            f"\n  Warning: fewer than 25 images for {', '.join(thin)}. Metrics on a class "
            "this small\n  are dominated by which few photographs landed in the "
            "validation split, so treat them as indicative only."
        )

    train_loader = DataLoader(
        Subset(train_ds, train_idx), batch_size=args.batch_size, shuffle=True,
        num_workers=args.workers, pin_memory=(device.type == "cuda"),
    )
    val_loader = DataLoader(
        Subset(eval_ds, val_idx), batch_size=args.batch_size, shuffle=False,
        num_workers=args.workers, pin_memory=(device.type == "cuda"),
    )

    model = build_model(args.architecture, len(CLASSES), pretrained=True).to(device)

    # Inverse-frequency class weights. Hospital waste streams are genuinely
    # imbalanced, and without this the model can score well by simply never
    # predicting the rarest category — which in this domain is the one whose
    # mistakes are most dangerous.
    total = sum(counts.get(i, 0) for i in range(len(CLASSES)))
    weights = torch.tensor(
        [total / (len(CLASSES) * counts.get(i, 1)) if counts.get(i, 0) else 1.0
         for i in range(len(CLASSES))],
        dtype=torch.float,
    ).to(device)
    print("  class weights: " + ", ".join(f"{CLASSES[i]} {weights[i]:.2f}" for i in range(len(CLASSES))))

    # A little label smoothing: it discourages the network from driving softmax
    # outputs to 0.999, which matters because a confidence score is used
    # downstream as a review threshold and needs to mean something.
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)

    best_accuracy = 0.0
    best_state = None
    started = time.time()

    # ---- Phase 1: frozen backbone -----------------------------------------
    if args.head_epochs > 0:
        print(f"\n  Phase 1 — head only ({args.head_epochs} epochs)")
        for parameter in model.parameters():
            parameter.requires_grad = False
        for parameter in head_parameters(model, args.architecture):
            parameter.requires_grad = True

        optimiser = torch.optim.AdamW(
            [p for p in model.parameters() if p.requires_grad], lr=args.lr, weight_decay=1e-4
        )
        for epoch in range(1, args.head_epochs + 1):
            tl, ta = run_epoch(model, train_loader, criterion, optimiser, device, train=True)
            vl, va = run_epoch(model, val_loader, criterion, optimiser, device, train=False)
            print(f"    epoch {epoch:>2}  train loss {tl:.4f} acc {ta:.3f}   val loss {vl:.4f} acc {va:.3f}")
            if va > best_accuracy:
                best_accuracy = va
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    # ---- Phase 2: full fine-tune ------------------------------------------
    print(f"\n  Phase 2 — full fine-tune ({args.epochs} epochs, lr {args.fine_tune_lr})")
    for parameter in model.parameters():
        parameter.requires_grad = True

    optimiser = torch.optim.AdamW(model.parameters(), lr=args.fine_tune_lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimiser, T_max=max(args.epochs, 1))

    for epoch in range(1, args.epochs + 1):
        tl, ta = run_epoch(model, train_loader, criterion, optimiser, device, train=True)
        vl, va = run_epoch(model, val_loader, criterion, optimiser, device, train=False)
        scheduler.step()
        marker = ""
        if va > best_accuracy:
            best_accuracy = va
            # Kept on CPU so the best weights survive even if a later epoch
            # exhausts GPU memory.
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            marker = "  <- best"
        print(f"    epoch {epoch:>2}  train loss {tl:.4f} acc {ta:.3f}   val loss {vl:.4f} acc {va:.3f}{marker}")

    # Save the best epoch, not the last. Later epochs frequently overfit, and the
    # final weights are not usually the ones you want in production.
    if best_state is not None:
        model.load_state_dict(best_state)
    model.to(device)

    matrix = confusion(model, val_loader, device, len(CLASSES))
    metrics = report(matrix)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    version = f"{args.architecture}-{time.strftime('%Y%m%d-%H%M')}"
    torch.save(
        {
            "state_dict": model.state_dict(),
            # Written so the classifier can refuse a checkpoint whose class order
            # disagrees with classes.json, rather than silently mislabelling.
            "classes": CLASSES,
            "architecture": args.architecture,
            "model_version": version,
            "input_size": settings.input_size,
            "normalization": {"mean": list(settings.norm_mean), "std": list(settings.norm_std)},
            "metrics": metrics,
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        },
        args.out,
    )

    elapsed = time.time() - started
    print(f"\n  Saved {args.out}  (version {version}, {elapsed / 60:.1f} min)")
    print(f"  Restart the service to pick it up. /health will then report model_trained: true.\n")

    summary = args.out.with_suffix(".metrics.json")
    summary.write_text(json.dumps({"model_version": version, **metrics}, indent=2), encoding="utf-8")
    print(f"  Metrics written to {summary}\n")


if __name__ == "__main__":
    main()
