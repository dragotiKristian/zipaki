# Copy the root files
FROM node:18-alpine as deps
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY tsconfig.json .

FROM deps as build-deps
COPY packages/editor-sales-gql/package.json ./packages/editor-sales-gql/package.json
COPY packages/gql/package.json ./packages/gql/package.json
COPY packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus @zipaki/editor-sales-gql

FROM build-deps as generate-step
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
RUN yarn workspace @zipaki/gql build
RUN yarn workspace @zipaki/gql-generated generate
RUN yarn workspace @zipaki/gql-generated generate:enums
RUN yarn workspace @zipaki/gql-generated build

# Build TS
FROM generate-step as ts-builder
COPY packages/editor-sales-gql ./packages/editor-sales-gql
COPY packages/gql ./packages/gql
COPY packages/gql-generated ./packages/gql-generated
RUN yarn workspace @zipaki/editor-sales-gql build


# Build Runtime Deps
FROM deps as editor-sales-builder
WORKDIR /app
COPY --from=ts-builder /app/packages/editor-sales-gql/package.json ./packages/editor-sales-gql/package.json
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
RUN yarn workspaces focus --production @zipaki/editor-sales-gql


FROM node:18-alpine
WORKDIR /app

# Runtime Node Modules
COPY --from=editor-sales-builder /app/node_modules ./node_modules

# TS Modules
# GQL
COPY --from=ts-builder /app/packages/gql/package.json ./packages/gql/package.json
COPY --from=ts-builder /app/packages/gql/build/ ./packages/gql/build/
COPY --from=ts-builder /app/packages/gql-generated/package.json ./packages/gql-generated/package.json
COPY --from=ts-builder /app/packages/gql-generated/build/ ./packages/gql-generated/build/

# BE
COPY --from=ts-builder /app/packages/editor-sales-gql/package.json ./packages/editor-sales-gql/package.json
COPY --from=ts-builder /app/packages/editor-sales-gql/build/ ./packages/editor-sales-gql/build/

CMD cd packages/editor-sales-gql && yarn start:nobuild