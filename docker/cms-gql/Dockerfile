# Copy the root files
FROM node:18-alpine as deps
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY tsconfig.json .

FROM deps as build-deps
COPY packages/mongo/package.json ./packages/mongo/package.json 
COPY packages/cms-gql/package.json ./packages/cms-gql/package.json
COPY packages/libs/package.json ./packages/libs/package.json
COPY packages/gql/package.json ./packages/gql/package.json
COPY packages/gql-generated/package.json ./packages/gql-generated/package.json
COPY packages/mongo-social/package.json  ./packages/mongo-social/package.json
RUN yarn workspaces focus @zipaki/cms-gql

FROM build-deps as generate-step
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
RUN yarn workspace @zipaki/gql build
RUN yarn workspace @zipaki/gql-generated generate
RUN yarn workspace @zipaki/gql-generated generate:enums
RUN yarn workspace @zipaki/gql-generated build

# Build TS
FROM generate-step as ts-builder
COPY packages/mongo/ ./packages/mongo/
COPY packages/cms-gql ./packages/cms-gql
COPY packages/libs ./packages/libs
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
COPY packages/mongo-social ./packages/mongo-social

RUN yarn workspace @zipaki/mongo-social build
RUN yarn workspace @zipaki/cms-gql build


# Build Runtime Deps
FROM deps as cms-builder
WORKDIR /app
COPY --from=ts-builder /app/packages/mongo/package.json ./packages/mongo/package.json
COPY --from=ts-builder /app/packages/mongo-social/package.json ./packages/mongo-social/package.json
COPY --from=ts-builder /app/packages/cms-gql/package.json ./packages/cms-gql/package.json
COPY --from=ts-builder /app/packages/libs/package.json ./packages/libs/package.json
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus --production @zipaki/cms-gql


FROM node:18-alpine
WORKDIR /app

# Runtime Node Modules
COPY --from=cms-builder /app/node_modules ./node_modules

# TS Modules
# GQL
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql/build/ ./packages/gql/build/
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
COPY --from=ts-builder /app/packages/gql-generated/build/ ./packages/gql-generated/build/

# Mongo Social
COPY --from=ts-builder /app/packages/mongo-social/package.json ./packages/mongo-social/package.json
COPY --from=ts-builder /app/packages/mongo-social/build/ ./packages/mongo-social/build/

# BE
COPY --from=ts-builder /app/packages/cms-gql/package.json ./packages/cms-gql/package.json
COPY --from=ts-builder /app/packages/cms-gql/build/ ./packages/cms-gql/build/

# Not TS
# Libs
COPY packages/libs ./packages/libs
# Mongo
COPY packages/mongo ./packages/mongo


EXPOSE 4000
EXPOSE 8000
CMD cd packages/cms-gql && yarn start:nobuild