FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build
RUN rm -rf apps/web/.next/cache

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/apps/web ./apps/web

EXPOSE 3000

CMD ["bun", "run", "start"]
