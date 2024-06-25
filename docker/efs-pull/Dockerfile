FROM node:18-alpine
WORKDIR /app
COPY ./packages/efs-pull .
RUN yarn
CMD node index.js