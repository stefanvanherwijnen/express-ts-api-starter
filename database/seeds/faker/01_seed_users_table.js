import faker from 'faker'

const createFakeUser = () => (
  {
    email: faker.internet.email(),
    password: faker.internet.password()
  }
)
exports.seed = function (knex, Promise) {
  const fakeUsers = []
  for (let i = 0; i < 100; i++) {
    fakeUsers.push(createFakeUser())
  }
  return knex('users').insert(fakeUsers);
}
