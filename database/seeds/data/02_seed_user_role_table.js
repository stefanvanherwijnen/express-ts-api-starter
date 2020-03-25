exports.seed = function (knex, Promise) {
  return knex('user_role').del()
    .then(function () {
      return knex('user_role').insert([
        {
          role_id: 1,
          user_id: 1
        },
        {
          role_id: 2,
          user_id: 1
        }
      ])
    })
}
