ARG NODE_VERSION=24.13.0
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Install deps first for better caching
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build the production bundle so `vite preview` can serve it.
RUN npm run build

EXPOSE 9005

# Run the Vite preview server on 0.0.0.0 so it is reachable when using host networking.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "9005", "--strictPort"]
