FROM node:24-alpine AS builder
WORKDIR /app

# Сначала только зависимости: слой кешируется, пока не меняется package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
# Адрес API вшивается в сборку: /api — тот же origin, иначе полный URL бэкенда.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build


FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
