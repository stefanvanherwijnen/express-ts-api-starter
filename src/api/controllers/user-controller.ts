import {default as User } from "../models/user"
import JsonSerializer from '../helpers/json-serializer'
import databaseErrorHandler from '../helpers/database-error-handler'
import { paginate, createResource, readResource, patchResource, deleteResource } from '../helpers/json-api'
import bcrypt from "bcrypt"

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
      const results = await paginate(req, 'user', User, 'superuser')
      res.send(results)
    } catch (err) {
      res.status(err.statusCode ? err.statusCode : 400).send(JsonSerializer.serializeError(databaseErrorHandler(err)))
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
  *      '404':
  *        description: User was not found.
  */
  public async create(req, res): Promise<void> {
    try {
      let password = req.body.data.attributes.password ? await bcrypt.hash(req.body.data.attributes.password, 10) : undefined

      const data = await JsonSerializer.deserializeAsync('user', req.body)
      data.password = password

      const response = await createResource(req, 'user', User, data)
      res.send(response)
    } catch (err) {
      res.status(err.statusCode ? err.statusCode : 400).send(JsonSerializer.serializeError(databaseErrorHandler(err)))
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
      const result = await readResource(req, 'user', User)
      res.send(result)
    } catch (err) {
      res.status(err.statusCode ? err.statusCode : 400).send(JsonSerializer.serializeError(databaseErrorHandler(err)))
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
  */
  public async update(req, res): Promise<void> {
    try {
      const data = await JsonSerializer.deserializeAsync('user', req.body)

      data.password = data.password ? await bcrypt.hash(data.password, 10) : undefined

      const response = await patchResource(req, 'user', User, data, {relate: true, unrelate: true, noRelate: true, noUnrelate: true})
      res.send(response)
    } catch (err) {
      throw err
      res.status(err.statusCode ? err.statusCode : 400).send(JsonSerializer.serializeError(databaseErrorHandler(err)))
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
      const deleted = await deleteResource(req, 'user', User)
      if (deleted) {
        res.status(200).send()
      } else {
        res.status(404).send()
      }
    } catch (err) {
      res.status(err.statusCode ? err.statusCode : 400).send(JsonSerializer.serializeError(databaseErrorHandler(err)))
    }
  }
}
export default new Controller()
