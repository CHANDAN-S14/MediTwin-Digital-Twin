FROM node:20-alpine

WORKDIR /app

# Copy manifests first so `npm ci` is cached and only re-runs when dependencies
# actually change, rather than on every source edit.
COPY package*.json ./
# `npm ci` needs a lockfile; fall back to `install` so this image also builds
# from a fresh clone that has not been installed yet.
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY . .

# Runs as the node user rather than root. A container that only needs to listen
# on a port has no reason to have write access to its own image.
USER node

EXPOSE 5000
CMD ["node", "server.js"]
