FROM python:3.11-slim

WORKDIR /app

# libgomp is required by torch; libglib/libgl by Pillow's image codecs. Without
# them the import succeeds and the first prediction fails on a missing .so,
# which is a confusing place to discover a packaging problem.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch explicitly. The default wheel pulls the full CUDA runtime, which
# adds several gigabytes to an image that has no GPU to use it on.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
