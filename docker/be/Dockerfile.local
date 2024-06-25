# Copy the root files
FROM node:18-alpine as deps
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY tsconfig.json .


# Build MongoDB
FROM deps as mongo-builder
WORKDIR /app
COPY packages/mongo/ ./packages/mongo/
RUN yarn workspaces focus @zipaki/mongo


# Build backend
FROM deps as be-builder
WORKDIR /app
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
COPY packages/be/package.json ./packages/be/package.json
COPY packages/libs/package.json ./packages/libs/package.json
RUN yarn workspaces focus @zipaki/be @zipaki/libs --production


FROM node:18-alpine
WORKDIR /app
COPY packages/be ./packages/be
COPY packages/libs ./packages/libs
COPY packages/mongo ./packages/mongo
COPY --from=be-builder /app/node_modules ./node_modules
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
EXPOSE 3000
CMD cd packages/be && yarn start