FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL -o /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && chown node /usr/local/bin/yt-dlp \
  && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

USER node
# youtube breaks yt-dlp every few weeks, so update it on each start
CMD ["sh", "-c", "yt-dlp -U; exec node dist/index.js"]
