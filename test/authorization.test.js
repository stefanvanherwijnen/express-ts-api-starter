import "../src/common/env"
import appConfig from '../src/common/server'
import routes from '../src/routes'
import supertest from 'supertest'

import PasetoAuth from '../src/api/helpers/paseto-auth'

var app = (new appConfig).router(routes)
var server = app.create()
let request = supertest.agent(server)

describe('authorization', () => {
  afterAll(() => {
    app.close(server)
  })

  var user
  it('should login as user', async (done) => {
    const token = await PasetoAuth.loginById(2)
    request.set('Authorization', 'Bearer ' + token)

    done()
  })

  describe('authorized', () => {
    
  })

  describe('unauthorized', () => {
    describe('users', () => {
      it('should not be able to access the users endpoint', done => {
        request.get('/users')
          .expect(403, done)
      })
    })

  })
})
