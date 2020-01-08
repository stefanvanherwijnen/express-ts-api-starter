FROM node:13.5.0-alpine3.11

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk --no-cache add git python build-base

COPY ./package.json .
copy ./yarn.lock .

RUN yarn

COPY . .

COPY ./knexfile.js .

EXPOSE 3000

CMD yarn dev