import JsonSerializer from "~/api//helpers/json-serializer"
import databaseErrorHandler from "~/api//helpers/database-error-handler"
import {
    serialize,
    paginate,
    createResource,
    readResource,
    patchResource,
    deleteResource,
    fetchRelationship,
    fetchRelationshipResource,
    patchRelationship,
    relate,
    unrelate
} from "../helpers/json-api"
import { isArray } from "util"

function createResourceIdentifierObject (results, type, relationship = null): object {
    let data
    if (Array.isArray(results)) {
        data = results.map(item => {
            return {
                type: type,
                id: item.toString(),
                links: {
                    self: relationship + "/" + item.toString()
                }
            }
        })
    } else {
        data = {
            type: type,
            data: results.toString(),
            links: {
                self: relationship + "/" + results.toString()
            }
        }
    }
    return data
}

function index (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            let results = await paginate(req, model, { user: req.user })
            if (Array.isArray(results)) {
                results = results.map(item => item.toJSON())
            } else {
                results.results = results.results.map(item => item.toJSON())
            }
            res.send(await serialize(req, results, schema))
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function create (model, schema, struct): Function {
    return async (req, res): Promise<void> => {
        try {
            const data = await JsonSerializer.deserializeAsync(schema, req.body)
            try {
                await struct(data)
            } catch (err) {
                err.reason ? (err.message = err.reason) : null
                return res.status(422).send(JsonSerializer.serializeError(err))
            }
            const result = await createResource(req, model, data, { user: req.user })
            res.send(await serialize(req, result.toJSON(), schema))
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function read (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const result = await readResource(req, model, { user: req.user })
            res.send(await serialize(req, result.toJSON(), schema))
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function update (model, schema, struct): Function {
    return async (req, res): Promise<void> => {
        try {
            const data = await JsonSerializer.deserializeAsync(schema, req.body)
            try {
                await struct(data)
            } catch (err) {
                return res.status(422).send(JsonSerializer.serializeError(err))
            }
            const result = await patchResource(req, model, data, { user: req.user })
            res.send(await serialize(req, result.toJSON(), schema))
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function deletion (model): Function {
    return async (req, res): Promise<void> => {
        try {
            const deleted = await deleteResource(req, model, { user: req.user })
            if (deleted) {
                res.status(200).send()
            } else {
                res.status(404).send()
            }
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function readRelationship (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const relationship = req.params.relationship
            const results = await fetchRelationship(req, model, relationship, {
                user: req.user
            })
            const type =
                JsonSerializer.schemas[schema].default.relationships[relationship].type
            let data, links
            data = createResourceIdentifierObject(results, type, relationship)
            links = {
                self: req.originalUrl,
                related: req.originalUrl.replace("/relationships", "")
            }
            res.send({ links: links, data: data })
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function readRelationshipResource (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const relationship = req.params.relationship
            let results = await fetchRelationshipResource(req, model, relationship, {
                user: req.user
            })
            const type =
                JsonSerializer.schemas[schema].default.relationships[relationship].type
            if (Array.isArray(results)) {
                results = results.map(item => item.toJSON())
            } else {
                results = results.toJSON()
            }
            res.send(await serialize(req, results, type))
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function createRelationship (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const relationship = req.params.relationship
            const type =
                JsonSerializer.schemas[schema].default.relationships[relationship].type

            let data
            if (req.body.data) {
                if (Array.isArray(req.body.data)) {
                    data = req.body.data.map(item => {
                        if (item.type === type) {
                            return Number(item.id)
                        }
                    })
                } else {
                    if (req.body.data.type === type) {
                        data = Number(req.body.data.id)
                    }
                }
            } else {
                data = null
            }
            const results = await relate(req, model, data, relationship, {
                user: req.user
            })
            const response = { data: createResourceIdentifierObject(results, type) }
            if (
                (Array.isArray(data) &&
                    Array.isArray(results) &&
                    data.every(e => results.includes(e))) ||
                data === results
            ) {
                res.sendStatus(204)
            } else {
                res.send(response)
            }
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function updateRelationship (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const relationship = req.params.relationship
            const type =
                JsonSerializer.schemas[schema].default.relationships[relationship].type

            let data
            if (req.body.data) {
                if (Array.isArray(req.body.data)) {
                    data = req.body.data.map(item => {
                        if (item.type === type) {
                            return Number(item.id)
                        }
                    })
                } else {
                    if (req.body.data.type === type) {
                        data = Number(req.body.data.id)
                    }
                }
            } else {
                data = null
            }
            const results = await patchRelationship(req, model, data, relationship, {
                user: req.user
            })
            const response = { data: createResourceIdentifierObject(results, type) }
            if (
                (Array.isArray(data) &&
                    Array.isArray(results) &&
                    data.every(e => results.includes(e))) ||
                data === results
            ) {
                res.sendStatus(204)
            } else {
                res.send(response)
            }
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

function deleteRelationship (model, schema): Function {
    return async (req, res): Promise<void> => {
        try {
            const relationship = req.params.relationship
            const type =
                JsonSerializer.schemas[schema].default.relationships[relationship].type

            let data
            if (req.body.data) {
                if (Array.isArray(req.body.data)) {
                    data = req.body.data.map(item => {
                        if (item.type === type) {
                            return Number(item.id)
                        }
                    })
                } else {
                    if (req.body.data.type === type) {
                        data = Number(req.body.data.id)
                    }
                }
            } else {
                data = null
            }
            const results = await unrelate(req, model, data, relationship, {
                user: req.user
            })
            const response = { data: createResourceIdentifierObject(results, type) }
            if (
                (Array.isArray(data) &&
                    Array.isArray(results) &&
                    data.every(e => results.includes(e))) ||
                data === results
            ) {
                res.sendStatus(204)
            } else {
                res.send(response)
            }
        } catch (err) {
            const error = databaseErrorHandler(err)
            res
                .status(error.statusCode ? error.statusCode : 400)
                .send(JsonSerializer.serializeError(error))
        }
    }
}

export {
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
}
