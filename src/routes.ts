import express from 'express'
import JsonSerializer from '~/api/helpers/json-serializer'

import authMiddleware from '~/api/middleware/auth'
import roleMiddleware from '~/api/middleware/roles'

import AuthController from '~/api/controllers/auth-controller'

import {
    index,
    create,
    read,
    update,
    deletion,
    readRelationship,
    readRelationshipResource,
    updateRelationship,
    createRelationship,
    deleteRelationship
} from "~/api/controllers/json-api-controller";
import User from '~/api/models/user'

async function jsonApiPayload (req, res, next): Promise<void> {
    if (Object.prototype.hasOwnProperty.call(req.body, 'data')) {
        next()
    } else {
        res.status(422).send(JsonSerializer.serializeError(new Error('JSON API format required.')))
    }
}

function JsonApiRoutes (resource, routes = ['index', 'read', 'create', 'update', 'delete', 'readRelationship', 'readRelationshipResource', 'createRelationship', 'updateRelationship', 'deleteRelationship']): express.Router {
    const router = express.Router()
    if (routes.includes('index')) {
        router.get("/", index(resource.model, resource.schema))
    }
    if (routes.includes('create')) {
        router.post(
            "/",
            jsonApiPayload,
            create(resource.model, resource.schema, resource.struct)
        )
    }
    if (routes.includes('read')) {
        router.get("/:id", read(resource.model, resource.schema))
    }
    if (routes.includes('update')) {
        router.patch(
            "/",
            jsonApiPayload,
            update(resource.model, resource.schema, resource.struct)
        )
    }
    if (routes.includes('delete')) {
        router.delete("/:id", deletion(resource.model))
    }
    if (routes.includes('readRelationship')) {
        router.get(
            "/:id/relationships/:relationship",
            readRelationship(resource.model, resource.schema)
        )
    }
    if (routes.includes('readRelationshipResource')) {
        router.get(
            "/:id/:relationship",
            readRelationshipResource(resource.model, resource.schema)
        )
    }
    if (routes.includes('createRelationship')) {
        router.post(
            "/:id/relationships/:relationship",
            createRelationship(resource.model, resource.schema)
        )
    }
    if (routes.includes('updateRelationship')) {
        router.patch(
            "/:id/relationships/:relationship",
            updateRelationship(resource.model, resource.schema)
        )
    }
    if (routes.includes('readRelationshipResource')) {
        router.delete(
            "/:id/relationships/:relationship",
            deleteRelationship(resource.model, resource.schema)
        )
    }
    return router
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

const authRoutes = express.Router()
    .post('/login', AuthController.login)
    .post('/register', AuthController.register)
    .get('/verify', AuthController.verify)
    .get('/user', authMiddleware, AuthController.getUser)
    .post('/password/forgot', AuthController.passwordForgot)
    .post('/password/reset', AuthController.passwordReset)


export default function routes (app): void {
    app.use('/auth', authRoutes)
    app.use('/users', authMiddleware, roleMiddleware(['superuser']), JsonApiRoutes(User))
    app.use('/admin', authMiddleware, roleMiddleware(['administrator']), (_req, res): void => { res.send('Administrator') })
}
