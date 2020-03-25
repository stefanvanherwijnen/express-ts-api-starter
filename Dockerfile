# build stage
FROM node:13.5.0-alpine3.11 as build-stage
WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk --no-cache add git python build-base

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn
COPY ./src ./src
COPY ./babel.config.js ./babel.config.js
COPY ./tsconfig.json ./tsconfig.json
RUN yarn build

# production stage
FROM node:13.5.0-alpine3.11 as production-stage
WORKDIR /app
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/package.json ./package.json
COPY --from=build-stage /app/node_modules ./node_modules

COPY ./public ./public
COPY ./console ./console
COPY ./database ./database
COPY ./knexfile.js ./knexfile.js

EXPOSE 3000
CMD yarn start