exports.up = function(knex, Promise) {
  return knex.schema.createTable('roles_roleable', function(table) {
    table.primary(['role_id', 'user_id'])
    table.integer('role_id').notNullable().unsigned().references('roles.id')
    table.integer('user_id').notNullable().unsigned()
    table.timestamps(false, true)
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('roles_roleable')
}
