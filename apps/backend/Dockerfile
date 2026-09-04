FROM node:22-alpine AS build
WORKDIR /repo
ENV DATABASE_URL=postgresql://build-only-placeholder
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN npm ci
COPY packages/contracts packages/contracts
COPY apps/backend apps/backend
RUN npm run build -w packages/contracts && npm run build -w apps/backend

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/src ./apps/backend/src
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /repo/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --from=build /repo/packages/contracts ./packages/contracts
USER node
EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
