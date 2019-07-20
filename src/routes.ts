import express from 'express'
import AuthController from './api/controllers/auth-controller'
import UsersController from './api/controllers/users-controller'
import JsonSerializer from './api/helpers/json-serializer'

import authMiddleware from './api/middleware/auth'
import roleMiddleware from './api/middleware/roles'

async function jsonApiPayload (req, res, next): Promise<void> {
  if (Object.prototype.hasOwnProperty.call(req.body, 'data')) {
    next()
  } else {
    res.status(422).send(JsonSerializer.serializeError(new Error('JSON API format required.')))
  }
}


/**
 * @swagger
 * components:
 *  securitySchemes:
 *    PasetoAuth:
 *      type: http
 *      scheme: bearer
 *      bearerFormat: Paseto    # optional, arbitrary value for documentation purposes
 *
 *  responses:
 *    UnauthorizedError:
 *      description: Access token is missing or invalid
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              errors:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    title:
 *                      type: string
 *
 *    ValidationError:
 *      description: Validation error
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              errors:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    title:
 *                      type: string
 *                    detail:
 *                      type: string
 *
 *    ForbiddenError:
 *      description: User does not have the correct permissions
 */
const userRoutes = express.Router()
  .get('/', UsersController.index)
  .post('/', jsonApiPayload, UsersController.create)
  .get('/:id', UsersController.read)
  .patch('/', jsonApiPayload, UsersController.update)
  .delete('/:id', UsersController.delete)

const authRoutes = express.Router()
  .post('/login', AuthController.login)
  .post('/register', AuthController.register)
  .get('/verify', AuthController.verify)
  .get('/user', authMiddleware, AuthController.getUser)
  .post('/password/forgot', AuthController.passwordForgot)
  .post('/password/reset', AuthController.passwordReset)


export default function routes(app): void {
  app.use('/auth', authRoutes)
  app.use('/users', authMiddleware, roleMiddleware(['superuser']), userRoutes)
  app.use('/admin', authMiddleware, roleMiddleware(['administrator']), (res, req): void => {res.send('Administrator')})
}
