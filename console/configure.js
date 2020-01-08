#!/usr/bin/env babel-node --
import '../src/common/env'
import program from 'commander'
import paseto from 'paseto'
const { V2 } = paseto

import knex from '../src/common/knex'
import { Model } from 'objection'
Model.knex(knex)

import knexConfig from '../knexfile'
import { Model as User } from '../src/api/models/user.ts'


const generateNewKey = async () => {
    const key = await V2.generateKey('local')
    const base64 = key.export()
    console.log(base64.toString('base64'))
}

const databaseFunctions = async (method, argument) => {
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
            const config = knexConfig[process.env.NODE_ENV]
            if (argument) {
                console.log('Seeding from folder: ' + argument)
                const pathArray = config.seeds.directory.split('/')
                pathArray[pathArray.length - 1] = argument
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

const assignRole = async (email, roleName) => {
    let user
    try {
        user = await User.query()
            .findOne('email', email)
            .throwIfNotFound()
        await user.assignRole(roleName)
    } catch (err) {
        console.error(err)
        knex.destroy()
        return
    }
    knex.destroy()
    console.log('Role successfully added')
}

program
    .version('0.0.1')
    .command('generate-key')
    .description('Generate a new PASETO key')
    .action(generateNewKey)

program
    .command('database:migrate')
    .description('Migrate database')
    .action(function () {
        databaseFunctions('migrate')
    })

program
    .command('database:rollback')
    .description('Rollback database')
    .action(function () {
        databaseFunctions('rollback')
    })

program
    .command('database:refresh')
    .description('Refresh database')
    .action(function () {
        databaseFunctions('refresh')
    })

program
    .command('database:seed [folder]')
    .description('Seed database')
    .action(function (folder) {
        databaseFunctions('seed', folder)
    })

program
    .command('user:assign-role [email] [role]')
    .description('Asign role to user')
    .action(function (email, role) {
        assignRole(email, role)
    })

program.on('command:*', function () {
    console.error(
        'Invalid command: %s\nSee --help for a list of available commands.',
        program.args.join(' ')
    )
    process.exit(1)
})

program.parse(process.argv)
