#!/bin/sh
docker exec express-ts-api-starter_app_1 node_modules/knex/bin/cli.js migrate:latest
docker exec express-ts-api-starter_app_1 node_modules/knex/bin/cli.js seed:run
# docker exec express-ts-api-starter_app_1 yarn configure database:seed data