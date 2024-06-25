# Copy the root files
FROM node:18-alpine as deps
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY tsconfig.json .


# Build Report
FROM deps as report-builder
WORKDIR /app
COPY packages/mongo/ ./packages/mongo/
COPY packages/editor-sales-report/package.json ./packages/editor-sales-report/package.json
RUN yarn workspaces focus @zipaki/editor-sales-report
COPY packages/editor-sales-report ./packages/editor-sales-report
RUN yarn workspace @zipaki/editor-sales-report build

# Build Report Production Dependencies
FROM deps as report-deps-builder
WORKDIR /app
COPY packages/mongo/ ./packages/mongo/
COPY packages/editor-sales-report/package.json ./packages/editor-sales-report/package.json
RUN yarn workspaces focus --production @zipaki/editor-sales-report


FROM node:18-alpine
WORKDIR /app
COPY --from=report-builder /app/packages/editor-sales-report/build ./packages/editor-sales-report/build
COPY packages/editor-sales-report/package.json ./packages/editor-sales-report/package.json
COPY --from=report-deps-builder /app/node_modules ./node_modules
COPY packages/mongo ./packages/mongo
CMD cd packages/editor-sales-report && yarn start