const bcrypt = require('bcrypt')

exports.seed = function (knex, Promise) {
  return knex('users').del()
    .then(function () {
      return knex('users').insert([
        {
          email: 'admin@demo.com',
          password: bcrypt.hashSync('password', 10),
          verified: true
        },
        {
          email: 'user@demo.com',
          password: bcrypt.hashSync('password', 10),
          verified: true
        }
      ])
    })
}
