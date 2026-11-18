FROM node:26-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm --prefix web install || npm install
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 7824
USER node
CMD ["node", "server/src/server.js"]
