FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 MENU_DATA_DIR=/data
USER node
VOLUME /data
EXPOSE 8080
CMD ["node", "scripts/start-production.cjs"]
