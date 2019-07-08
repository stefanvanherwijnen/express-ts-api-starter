import "../src/common/env"
import appConfig from '../src/common/server';
import routes from '../src/routes';
import supertest from 'supertest';
import JsonSerializer from '../src/api/helpers/json-serializer'

import { JsonApiTest } from './jsonapi'

var app = (new appConfig).router(routes).create()
let request = supertest(app);

describe('user', () => {
  process.env.TEST_IS_ADMIN = true

  const user = {
    email: 'randomuser@user.test',
    password: 'PasswordForTtesting',
    name: 'NewUser'
  }
  const data = JSON.parse(JSON.stringify(JsonSerializer.serialize('user', user)))
  const updatedData = JSON.parse(JSON.stringify(data))
  updatedData.data.id = '1'
  updatedData.data.attributes.name = 'UpdatedName'

  data.data.attributes.email = 'test123@123test.test'
  data.data.attributes.password = 'passwordtest'

  describe('jsonapi', () => {
    JsonApiTest(request, '/users', 'user', data, updatedData)
  })
})