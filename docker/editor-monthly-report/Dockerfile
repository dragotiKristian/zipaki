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
COPY packages/editor-monthly-report/package.json ./packages/editor-monthly-report/package.json
RUN yarn workspaces focus @zipaki/editor-monthly-report
COPY packages/editor-monthly-report ./packages/editor-monthly-report
RUN yarn workspace @zipaki/editor-monthly-report build

# Build Report Production Dependencies
FROM deps as report-deps-builder
WORKDIR /app
COPY packages/mongo/ ./packages/mongo/
COPY packages/editor-monthly-report/package.json ./packages/editor-monthly-report/package.json
RUN yarn workspaces focus --production @zipaki/editor-monthly-report


FROM node:18-alpine
WORKDIR /app
COPY --from=report-builder /app/packages/editor-monthly-report/build ./packages/editor-monthly-report/build
COPY packages/editor-monthly-report/package.json ./packages/editor-monthly-report/package.json
COPY --from=report-deps-builder /app/node_modules ./node_modules
COPY packages/mongo ./packages/mongo
CMD cd packages/editor-monthly-report && yarn start