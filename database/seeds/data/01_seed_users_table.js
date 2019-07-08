const bcrypt = require('bcrypt');

exports.seed = function(knex, Promise) {
  return knex('users').del()
  .then(function () {
    return knex('users').insert([
    {
      name: 'Test user',
      email: 'demo@demo.com',
      password: bcrypt.hashSync('password', 10),
      verified: true
    }
    ])
  })
};
