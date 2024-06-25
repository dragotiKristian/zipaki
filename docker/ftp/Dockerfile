FROM node:18-alpine
WORKDIR /app
COPY yarn.lock ./yarn.lock
COPY .yarnrc.yml ./.yarnrc.yml
COPY .yarn ./.yarn/
COPY package.json .
COPY packages/ftp ./packages/ftp
RUN yarn workspaces focus --production @zipaki/ftp
CMD node packages/ftp/index.js