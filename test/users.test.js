import "../src/common/env"
import appConfig from '../src/common/server';
import routes from '../src/routes';
import supertest from 'supertest';
import JsonSerializer from '../src/api/helpers/json-serializer'
import PasetoAuth from '../src/api/helpers/paseto-auth'

import { JsonApiTest } from './jsonapi'

import './helpers/transactional_tests'

var app = (new appConfig).router(routes)
var server = app.create()
let request = supertest(server);

describe('user', () => {
  afterAll(() => {
    app.close(server)
  });
  
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
    it('should login as admin', async () => {
      await PasetoAuth.loginById(1)
    })

    JsonApiTest(request, '/users', 'user', data, updatedData)
  })
})