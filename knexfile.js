const types = require('pg').types
types.setTypeParser(1700, function (val) {
    return parseFloat(val)
})

module.exports = {
    development: {
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: './database/database.db'
        },
        migrations: {
            directory: './database/migrations'
        },
        seeds: {
            directory: './database/seeds/setup'
        },
        pool: {
            afterCreate: (conn, cb) => {
                conn.run('PRAGMA foreign_keys = ON', cb)
            }
        }
    },

    test: {
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: './database/test.db'
        },
        migrations: {
            directory: './database/migrations'
        },
        seeds: {
            directory: './database/seeds/setup'
        },
        pool: {
            afterCreate: (conn, cb) => {
                conn.run('PRAGMA foreign_keys = ON', cb)
            }
        }
    },

    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: {
            directory: [
                './database/migrations',
            ]
        },
        seeds: {
            directory: './database/seeds/setup'
        }
    },

    docker: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: {
            directory: [
                './database/migrations',
            ]
        },
        seeds: {
            directory: './database/seeds/setup'
        }
    }
}
