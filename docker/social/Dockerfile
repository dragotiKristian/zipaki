# Copy the root files
FROM node:18-alpine as deps
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY tsconfig.json .

FROM deps as build-deps
COPY packages/social/package.json ./packages/social/package.json
COPY packages/gql/package.json ./packages/gql/package.json
COPY packages/gql-generated/package.json ./packages/gql-generated/package.json
COPY packages/mongo-social/package.json  ./packages/mongo-social/package.json
RUN yarn workspaces focus @zipaki/social

FROM build-deps as generate-step
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
RUN yarn workspace @zipaki/gql build
RUN yarn workspace @zipaki/gql-generated generate
RUN yarn workspace @zipaki/gql-generated generate:enums
RUN yarn workspace @zipaki/gql-generated build

# Build TS
FROM generate-step as ts-builder
COPY packages/social ./packages/social
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
COPY packages/mongo-social ./packages/mongo-social

RUN yarn workspace @zipaki/mongo-social build
RUN yarn workspace @zipaki/social build


# Build Runtime Deps
FROM deps as social-builder
WORKDIR /app
COPY --from=ts-builder /app/packages/mongo-social/package.json ./packages/mongo-social/package.json
COPY --from=ts-builder /app/packages/social/package.json ./packages/social/package.json
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus --production @zipaki/social


FROM node:18-alpine
WORKDIR /app

# Runtime Node Modules
COPY --from=social-builder /app/node_modules ./node_modules

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
COPY --from=ts-builder /app/packages/social/package.json ./packages/social/package.json
COPY --from=ts-builder /app/packages/social/build/ ./packages/social/build/

EXPOSE 4000
CMD cd packages/social && yarn start