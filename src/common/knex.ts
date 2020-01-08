import Knex from "knex";

const types = require('pg').types
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

import knexConfig from '../../knexfile.js'

const env = process.env.NODE_ENV

export default Knex(knexConfig[env]);
