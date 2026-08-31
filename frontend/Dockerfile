FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

COPY . .

EXPOSE 5173
# --host binds 0.0.0.0 instead of localhost. Without it the dev server is
# unreachable from outside the container even with the port published.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
