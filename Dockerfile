ARG NODE_VERSION=24.13.0
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM base AS dev
COPY . .
EXPOSE 9005
# Run the Vite dev server with hot reloading enabled
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "9005", "--strictPort"]


FROM base AS builder
COPY . .
RUN npm run build


FROM nginx:1.25-alpine AS prod

RUN sed -i 's/listen       80;/listen       9005;/g' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html/admin-console

EXPOSE 9005
CMD ["nginx", "-g", "daemon off;"]
