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


# Build cms
FROM deps as cms-builder
WORKDIR /app
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
COPY packages/cms/package.json ./packages/cms/package.json
COPY packages/libs/package.json ./packages/libs/package.json
RUN yarn workspaces focus @zipaki/cms @zipaki/libs --production


FROM node:18-alpine
WORKDIR /app
COPY packages/cms ./packages/cms
COPY packages/libs ./packages/libs
COPY packages/mongo ./packages/mongo
COPY --from=cms-builder /app/node_modules ./node_modules
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
EXPOSE 4000
CMD cd packages/cms && yarn start