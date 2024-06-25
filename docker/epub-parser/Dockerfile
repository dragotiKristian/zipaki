# Copy the root files
FROM node as deps
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
FROM deps as epub-parser-builder
WORKDIR /app
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
COPY packages/epub-parser/package.json ./packages/epub-parser/package.json
COPY packages/libs/package.json ./packages/libs/package.json
RUN yarn workspaces focus @zipaki/epub-parser @zipaki/libs --production

FROM node:18 as linux-deps
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
        --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

FROM linux-deps
WORKDIR /app
COPY packages/epub-parser ./packages/epub-parser
COPY packages/libs ./packages/libs
COPY packages/mongo ./packages/mongo
COPY --from=epub-parser-builder /app/node_modules ./node_modules
COPY --from=mongo-builder /app/packages/mongo/package.json ./packages/mongo/package.json
CMD cd packages/epub-parser && yarn start