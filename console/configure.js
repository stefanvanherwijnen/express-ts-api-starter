#!/usr/bin/env babel-node --
import program from 'commander'
import paseto from 'paseto'
const { V2 } = paseto

import Knex from "knex";
let knex

import knexConfig from '../knexfile'

const generateNewKey = async () => {
    const key = await V2.generateKey('local')
    const base64 = key.export()
    console.log(base64.toString('base64'))
}

const databaseFunctions = async (method, options) => {
    if (options.environment) {
        knex = Knex(knexConfig[options.environment]);
        console.log('Using environment: ', options.environment)
    }
    switch (method) {
        case 'rollback':
            await knex.migrate.rollback({}, true)
            console.log('Database has been rolled back')
            break
        case 'migrate':
            await knex.migrate.latest()
            console.log('Database has been migrated')
            break
        case 'refresh':
            await knex.migrate.rollback({}, true)
            await knex.migrate.latest()
            console.log('Database has been refreshed')
            break
        case 'seed':
            const config = knexConfig[options.environment]
            if (options.folder) {
                console.log('Seeding from folder: ' + options.folder)
                const pathArray = config.seeds.directory.split('/')
                pathArray[pathArray.length - 1] = options.folder
                config.seeds.directory = pathArray.join('/')
            }
            await knex.seed.run(config)
            console.log('Database has been seeded')
            break
        default:
            console.log('No method specified')
    }
    knex.destroy()
}

program
    .version('0.0.1')
    .command('generate-key')
    .description('Generate a new PASETO key')
    .action(generateNewKey)

program
    .command('database <cmd>')
    .option('-f, --folder <folder>', 'Folder to seed')
    .requiredOption('-env, --environment <environment>', 'environment')
    .description('Database functions')
    .action(async function (cmd, options) {
        await databaseFunctions(cmd, { environment: options.environment, folder: options.folder })
    })

program.on('command:*', function () {
    console.error(
        'Invalid command: %s\nSee --help for a list of available commands.',
        program.args.join(' ')
    )
    process.exit(1)
})

program.parse(process.argv)