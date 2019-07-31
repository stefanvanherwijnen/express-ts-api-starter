import {default as User, UserStruct } from '../models/user'
import JsonSerializer from '../helpers/json-serializer'
import databaseErrorHandler from '../helpers/database-error-handler'
import { serialize, paginate, createResource, readResource, patchResource, deleteResource } from '../helpers/json-api'
import bcrypt from 'bcrypt'

/**
* @swagger
* components:
*  schemas:
*    User:
*      type: object
*      required:
*      - email
*      - password
*      - name
*      properties:
*        email:
*          type: string
*          format: email
*        password:
*          type: string
*          format: password
*          writeOnly: true
*        name:
*          type: string
*/
class Controller {
  /**
  * @swagger
  * /users:
  *   get:
  *     tags:
  *      - Users
  *     summary: Get a list of users
  *     responses:
  *      '200':
  *        description: Return a list of users
  *        content:
  *          application/json:
  *            schema:
  *              type: object
  *              properties:
  *                data:
  *                  type: array
  *                  items:
  *                    type: object
  *                    properties:
  *                      type:
  *                        type: string
  *                        example: "user"
  *                      id:
  *                        type: string
  *                        example: "1"
  *                      attributes:
  *                        type: object
  *                        $ref: '#/components/schemas/User'
  *                      relationships:
  *                        type: object
  *      '400':
  *        description: Database error
  */
  public async index(req, res): Promise<void> {
    try {
      const results = await paginate(req, User)
      res.send(await serialize(req, results, 'user'))
    } catch (err) {
      const error = databaseErrorHandler(err)
      res.status(error.statusCode ? error.statusCode : 400).send(JsonSerializer.serializeError(error))
    }
  }

  /**
  * @swagger
  * /users:
  *   post:
  *     tags:
  *      - Users
  *     summary: Create an user
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               data:
  *                 type: object
  *                 properties:
  *                   type:
  *                     type: string
  *                     example: "user"
  *                   id:
  *                     type: string
  *                     example: "1"
  *                   attributes:
  *                     type: object
  *                     $ref: '#/components/schemas/User'
  *                   relationships:
  *                     type: object
  *     responses:
  *      '200':
  *        description: Return the created user
  *        content:
  *          application/json:
  *            schema:
  *              type: object
  *              properties:
  *                data:
  *                  type: object
  *                  properties:
  *                    type:
  *                      type: string
  *                      example: "user"
  *                    id:
  *                      type: string
  *                      example: "1"
  *                    attributes:
  *                      type: object
  *                      $ref: '#/components/schemas/User'
  *                    relationships:
  *                      type: object
  *      '400':
  *        description: Database error
  *      '422':
  *        description: Unprocessable entity
  */
  public async create(req, res): Promise<void> {
    try {
      const password = req.body.data.attributes.password ? await bcrypt.hash(req.body.data.attributes.password, 10) : undefined

      const data = await JsonSerializer.deserializeAsync('user', req.body)
      try {
        UserStruct(data)
      } catch (err) {
        res.status(422).send(JsonSerializer.serializeError(err))
        return
      }
      data.password = password

      const result = await createResource(req, User, data)
      res.send(await serialize(req, result, 'user'))
    } catch (err) {
      const error = databaseErrorHandler(err)
      res.status(error.statusCode ? error.statusCode : 400).send(JsonSerializer.serializeError(error))
    }
  }

  /**
  * @swagger
  * /users/{id}:
  *   get:
  *     tags:
  *      - Users
  *     summary: Retrieve an user by id
  *     parameters:
  *       - in: path
  *         name: id
  *         schema:
  *           type: integer
  *         rquired: true
  *         description: Numeric ID of the user to retrieve
  *     responses:
  *      '200':
  *        description: Return the requested user
  *        content:
  *          application/json:
  *            schema:
  *              type: object
  *              properties:
  *                data:
  *                  type: object
  *                  properties:
  *                    type:
  *                      type: string
  *                      example: "user"
  *                    id:
  *                      type: string
  *                      example: "1"
  *                    attributes:
  *                      type: object
  *                      $ref: '#/components/schemas/User'
  *                    relationships:
  *                      type: object
  *      '400':
  *        description: Database error
  *      '404':
  *        description: Requested User was not found.
  */
  public async read(req, res): Promise<void> {
    try {
      const result = await readResource(req, User)
      res.send(await serialize(req, result, 'user'))
    } catch (err) {
      const error = databaseErrorHandler(err)
      res.status(error.statusCode ? error.statusCode : 400).send(JsonSerializer.serializeError(error))
    }
  }

  /**
  * @swagger
  * /users:
  *   patch:
  *     tags:
  *      - Users
  *     summary: Update an user
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               data:
  *                 type: object
  *                 properties:
  *                   type:
  *                     type: string
  *                     example: "user"
  *                   id:
  *                     type: string
  *                     example: "1"
  *                   attributes:
  *                     type: object
  *                     $ref: '#/components/schemas/User'
  *                   relationships:
  *                     type: object
  *     responses:
  *      '200':
  *        description: Return the updated user
  *        content:
  *          application/json:
  *            schema:
  *              type: object
  *              properties:
  *                data:
  *                  type: object
  *                  properties:
  *                    type:
  *                      type: string
  *                      example: "user"
  *                    id:
  *                      type: string
  *                      example: "1"
  *                    attributes:
  *                      type: object
  *                      $ref: '#/components/schemas/User'
  *                    relationships:
  *                      type: object
  *      '400':
  *        description: Database error
  *      '404':
  *        description: User was not found.
  *      '422':
  *        description: Unprocessable entity
  */
  public async update(req, res): Promise<void> {
    try {
      const data = await JsonSerializer.deserializeAsync('user', req.body)

      try {
        UserStruct(data)
      } catch (err) {
        res.status(422).send(JsonSerializer.serializeError(err))
        return
      }

      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10)
      }

      const result = await patchResource(req, User, data, {relate: true, unrelate: true, noRelate: true, noUnrelate: true})
      res.send(await serialize(req, result, 'user'))
    } catch (err) {
      const error = databaseErrorHandler(err)
      res.status(error.statusCode ? error.statusCode : 400).send(JsonSerializer.serializeError(error))
    }
  }

  /**
  * @swagger
  * /users/{id}:
  *   delete:
  *     tags:
  *      - Users
  *     summary: Delete an user by id
  *     parameters:
  *       - in: path
  *         name: id
  *         schema:
  *           type: integer
  *         rquired: true
  *         description: Numeric ID of the user to delete
  *     responses:
  *      '200':
  *        description: User deleted
  *      '400':
  *        description: Database error
  *      '404':
  *        description: Requested User was not found.
  */
  public async delete(req, res): Promise<void> {
    try {
      const deleted = await deleteResource(req, User)
      if (deleted) {
        res.status(200).send()
      } else {
        res.status(404).send()
      }
    } catch (err) {
      const error = databaseErrorHandler(err)
      res.status(error.statusCode ? error.statusCode : 400).send(JsonSerializer.serializeError(error))
    }
  }
}
export default new Controller()
