import Knex from "knex";

import { types } from 'pg'
types.setTypeParser(1700, function (val): number {
    return parseFloat(val);
});

import knexConfig from '../../knexfile.js'

const env = process.env.NODE_ENV

export default Knex(knexConfig[env]);
