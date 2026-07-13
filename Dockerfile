FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js extract-mcu-to-excel.js ./
COPY lib/ ./lib/
COPY public/ ./public/

RUN mkdir -p "PDF FIle" "PDF-backup" "Excel File"

ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_UPLOAD_FILES=50
ENV MAX_UPLOAD_MB=15

EXPOSE 3000

CMD ["node", "server.js"]
