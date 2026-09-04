FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN npm ci
COPY packages/contracts packages/contracts
COPY apps/frontend apps/frontend
RUN npm run build -w packages/contracts && npm run build -w apps/frontend

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 8080
