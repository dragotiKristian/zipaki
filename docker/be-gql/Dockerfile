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
COPY packages/be-gql/package.json ./packages/be-gql/package.json
COPY packages/libs/package.json ./packages/libs/package.json
COPY packages/gql/package.json ./packages/gql/package.json
COPY packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus @zipaki/be-gql

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
COPY packages/be-gql ./packages/be-gql
COPY packages/libs ./packages/libs
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated

RUN yarn workspace @zipaki/be-gql build


# Build Runtime Deps
FROM deps as be-builder
WORKDIR /app
COPY --from=ts-builder /app/packages/mongo/package.json ./packages/mongo/package.json
COPY --from=ts-builder /app/packages/be-gql/package.json ./packages/be-gql/package.json
COPY --from=ts-builder /app/packages/libs/package.json ./packages/libs/package.json
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus --production @zipaki/be-gql


FROM node:18-alpine
WORKDIR /app

# Runtime Node Modules
COPY --from=be-builder /app/node_modules ./node_modules

# TS Modules
# GQL
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql/build/ ./packages/gql/build/
# GQL
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
COPY --from=ts-builder /app/packages/gql-generated/build/ ./packages/gql-generated/build/

# BE
COPY --from=ts-builder /app/packages/be-gql/package.json ./packages/be-gql/package.json
COPY --from=ts-builder /app/packages/be-gql/build/ ./packages/be-gql/build/

# Not TS
# Libs
COPY packages/libs ./packages/libs
# Mongo
COPY packages/mongo ./packages/mongo


EXPOSE 3000
CMD cd packages/be-gql && yarn start:nobuild