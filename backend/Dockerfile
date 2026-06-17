FROM node:22-alpine

WORKDIR /app

# Install deps (scripts berjalan normal di image bersih → Prisma engines terunduh)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma: salin schema + migrations, lalu generate client
COPY prisma ./prisma
RUN npx prisma generate

# Source
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

# Terapkan migrasi ke DB di volume, lalu jalankan (bot + API + cron)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
