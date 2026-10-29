FROM node:24-alpine

WORKDIR /app
COPY package.json server.mjs ./
COPY public ./public
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=4180
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/methodlab.db

EXPOSE 4180
VOLUME ["/app/data"]
CMD ["node", "server.mjs"]
