import url from "url"
import JsonSerializer from "./json-serializer"
import { Model } from "objection"

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const compare = ((value, operator, comparedValue) => {
    switch (operator) {
        case '=':
            return value === comparedValue
        case '>':
            return value > comparedValue
        case '<':
            return value < comparedValue
        case '<=':
            return value <= comparedValue
        case '>=':
            return value >= comparedValue
    }
})

export const parseUrl = (req: {
    baseUrl: string;
    queryParameters: {
        filter: object;
        fields: object;
        include: string;
        page: {
            number: number;
            size: number;
        };
    };
}) => {
    return {
        baseUrl: url.parse(req.originalUrl).pathname,
        queryParameters: {
            filter: req.query.filter ? req.query.filter : undefined,
            fields: req.query.fields ? req.query.fields : undefined,
            sort: req.query.sort ? req.query.sort : undefined,
            include: req.query.include ? "[" + req.query.include + "]" : undefined,
            page: req.query.page
                ? {
                    number: req.query.page.number ? parseInt(req.query.page.number) : 1,
                    size: req.query.page.size ? parseInt(req.query.page.size) : 5
                }
                : { number: 1, size: 5 }
        }
    }
}

function sparseFieldsets (model, query, queryParameter): void {
    for (const resource in queryParameter) {
        let fields
        if (resource === model.tableName) {
            fields = queryParameter[resource].split(",").map(item => camelToSnakeCase(item))
            if (!fields.includes('id')) {
                fields.push("id")
            }
            query.select(fields)
        } else {
            fields = queryParameter[resource].split(",").map(item => camelToSnakeCase(item))
            if (!fields.includes('id')) {
                fields.push("id")
            }
            query.modifyGraph(resource, (builder): void => {
                builder.select(fields)
            })
        }
    }
}

export async function serialize (
    req,
    results,
    schema,
    customSchema = null
): Promise<object> {
    if (req.user && req.user.roleNames) {
        req.user.roleNames.forEach((role): void => {
            if (role in JsonSerializer.schemas[schema]) {
                customSchema = role
            }
        })
    }

    let extraData = {}

    if ("results" in results) {
        const page = req.parsedUrl.queryParameters.page.number
        const pageSize = req.parsedUrl.queryParameters.page.size
        const pageQueryString = (number): string => {
            return "?page[number]=" + number + "&page[size]=" + pageSize
        }

        extraData = {
            topLevelLinks: {
                self: req.parsedUrl.baseUrl + pageQueryString(page),
                next:
                    Number(page) < results.results.length
                        ? req.parsedUrl.baseUrl + pageQueryString(Number(page) + 1)
                        : undefined,
                previous:
                    Number(page) > 1
                        ? req.parsedUrl.baseUrl + pageQueryString(Number(page) - 1)
                        : undefined,
                last:
                    req.parsedUrl.baseUrl +
                    pageQueryString(Math.ceil(results.total / Number(pageSize)))
            },
            topLevelMeta: {
                total: results.total
            }
        }
        results = results.results
    }
    const response = await JsonSerializer.serializeAsync(
        schema,
        results,
        customSchema,
        extraData
    )
    return response
}

export async function paginate (req, model, context = null): Promise<object> {
    req.parsedUrl = req.parsedUrl ? req.parsedUrl : parseUrl(req)

    const page = req.parsedUrl.queryParameters.page.number
    const pageSize = req.parsedUrl.queryParameters.page.size
    const filter = req.parsedUrl.queryParameters.filter
    const sort = req.parsedUrl.queryParameters.sort

    const query = model
        .query()
        .context(context)
        .withGraphFetched(req.parsedUrl.queryParameters.include)
    if (sort) {
        const sortFields = sort.split(',')
        query.orderBy(sortFields.map(field => {
            return {
                column: field.replace('-', ''), order: field.indexOf('-') !== -1 ? 'desc' : undefined
            }
        }
        ))
    }
    // https://www.drupal.org/docs/8/modules/jsonapi/filtering
    if (typeof filter === 'object') {
        const filters = {}
        for (const field in filter) {
            if (typeof filter[field] === 'object') {
                if ('group' in filter[field]) {
                    if (!filters[field]) {
                        filters[field] = {}
                    }
                    filters[field]['conjunction'] = filter[field]['group']['conjunction']
                } else if ('condition' in filter[field]) {
                    let label
                    if ('memberOf' in filter[field]['condition']) {
                        label = filter[field]['condition']['memberOf']
                    } else {
                        label = field
                    }

                    if (!filters[label]) {
                        filters[label] = {}
                    }
                    if (!filters[label]['filters']) {
                        filters[label]['filters'] = []
                    }
                    filters[label]['filters'] = [
                        ...filters[label]['filters'],
                        {
                            path: filter[field]['condition']['path'],
                            operator: filter[field]['condition']['operator'] ? filter[field]['condition']['operator'] : '=',
                            value: filter[field]['condition']['value']
                        }
                    ]
                }
            } else {
                if (!filters[field]) {
                    filters[field] = {}
                }
                filters[field]['filters'] = [{
                    path: field,
                    operator: 'like',
                    value: '%' + filter[field] + '%'
                }]
            }
        }
        for (const label in filters) {
            const conjunction = ('conjunction' in filters[label]) ? filters[label]['conjunction'] : 'AND'
            if (!['OR', 'AND'].includes(conjunction)) {
                throw new Error('Invalid conjunction ' + conjunction)
            }
            for (const groupFilter of filters[label]['filters']) {
                if (groupFilter['path'].lastIndexOf('.') !== -1) {
                    const pathArray = groupFilter['path'].split('.')
                    if (pathArray.length === 2) {
                        if (conjunction === 'OR') {
                            query.orWhereExists(model.relatedQuery(camelToSnakeCase(pathArray[0])).where(camelToSnakeCase(pathArray[1]), groupFilter.operator, groupFilter.value))
                        } else {
                            query.whereExists(model.relatedQuery(camelToSnakeCase(pathArray[0])).where(camelToSnakeCase(pathArray[1]), groupFilter.operator, groupFilter.value))
                        }
                    } else if (pathArray.length === 3) {
                        if (conjunction === 'OR') {
                            query.orWhereExists(model.relatedQuery(camelToSnakeCase(pathArray[0])).orderBy('id', 'desc').offset(parseInt(pathArray[1])).limit(1).select(camelToSnakeCase(pathArray[2])).where(camelToSnakeCase(pathArray[2]), groupFilter.operator, groupFilter.value))
                        } else {
                            query.whereExists(model.relatedQuery(camelToSnakeCase(pathArray[0])).orderBy('id', 'desc').offset(parseInt(pathArray[1])).limit(1).select(camelToSnakeCase(pathArray[2])).where(camelToSnakeCase(pathArray[2]), groupFilter.operator, groupFilter.value))
                        }
                    }
                } else {
                    if (conjunction === 'OR') {
                        query.orWhere(camelToSnakeCase(groupFilter.path), groupFilter.operator, groupFilter.value)
                    } else {
                        query.where(camelToSnakeCase(groupFilter.path), groupFilter.operator, groupFilter.value)
                    }
                }
            }
        }
    }
    sparseFieldsets(model, query, req.parsedUrl.queryParameters.fields)

    let results
    if (pageSize === 0) {
        results = await query
    } else {
        results = await query.page(page - 1, pageSize)
    }
    return results
}

export async function createResource (
    req,
    model,
    data,
    context = null
): Promise<object> {
    const options = {
        relate: true
    }
    delete data.id

    req.parsedUrl = req.parsedUrl ? req.parsedUrl : parseUrl(req)
    const insert = await model
        .query()
        .context(context)
        .withGraphFetched(req.parsedUrl.queryParameters.include)
        .insertGraph(data, options)
    const result = await model
        .query()
        .context(context)
        .withGraphFetched(req.parsedUrl.queryParameters.include)
        .findById(insert.id)
    return result
}

export async function readResource (
    req,
    model,
    context = null
): Promise<object> {
    req.parsedUrl = req.parsedUrl ? req.parsedUrl : parseUrl(req)

    const query = model
        .query()
        .context(context)
        .withGraphFetched(req.parsedUrl.queryParameters.include)

    sparseFieldsets(model, query, req.parsedUrl.queryParameters.fields)

    const result = await query.findById(req.params.id)
    if (!result) {
        throw new Model.NotFoundError()
    }
    return result
}

export async function patchResource (
    req,
    model,
    data,
    context = null,
    options = null
): Promise<object> {
    options = options
        ? options
        : {
            relate: true,
            unrelate: true,
            // noInsert: true,
            // noDelete: true,
            // noRelate: true,
            // noUnrelate: true,
            noUpdate: model.relationMappings
                ? Object.keys(model.relationMappings)
                : undefined
        }
    data.id = Number(data.id)
    req.parsedUrl = req.parsedUrl ? req.parsedUrl : parseUrl(req)
    const instance = await model.query().context(context).withGraphFetched(req.parsedUrl.queryParameters.include).findById(data.id)
    for (const relation in model.relationMappings) {
        if (data[relation]) {
            const newIds = data[relation].map(v => v.id)
            const relatedIds = await instance.$relatedQuery(relation).select('id').then(items => items.map(it => it.id))
            const remove = relatedIds.filter(v => !newIds.includes(v))
            const add = newIds.filter(v => !relatedIds.includes(v))

            await instance.$relatedQuery(relation).unrelate().whereIn('id', remove)
            await instance.$relatedQuery(relation).relate(add)
        }
    }
    const result = instance.$query().context(context).patchAndFetch(data)

    return result
}

export async function deleteResource (
    req,
    model,
    context = null
): Promise<boolean> {
    req.parsedUrl = req.parsedUrl ? req.parsedUrl : parseUrl(req)

    const rowToDelete = await model
        .query()
        .context(context)
        .withGraphFetched(req.parsedUrl.queryParameters.include)
        .findById(req.params.id)
    if (rowToDelete) {
        await rowToDelete
            .$query()
            .context(context)
            .delete()
        return true
    }
    return false
}

export async function fetchRelationship (
    req,
    model,
    relationship,
    context = null
): Promise<object> {
    const instance = await model
        .query()
        .context(context)
        .findById(req.params.id)
        .throwIfNotFound()

    const relations = model.getRelations()
    if (relationship in relations) {
        const relation = await instance
            .$relatedQuery(relationship)
            .context(context)
            .then(items => items.map(it => it.id))
        return relation
    }
}

export async function fetchRelationshipResource (
    req,
    model,
    relationship,
    context = null
): Promise<object> {
    const instance = await model
        .query()
        .context(context)
        .findById(req.params.id)
        .throwIfNotFound()

    const relations = model.getRelations()
    if (relationship in relations) {
        const relation = await instance
            .$relatedQuery(relationship)
            .context(context)
        return relation
    }
}

export async function patchRelationship (
    req,
    model,
    data,
    relationship,
    context = null
): Promise<object> {
    const instance = await model
        .query()
        .context(context)
        .findById(req.params.id)
        .throwIfNotFound()

    const relations = model.getRelations()
    if (relationship in relations) {
        await instance
            .$relatedQuery(relationship)
            .context(context)
            .unrelate()
        if (data) {
            await instance
                .$relatedQuery(relationship)
                .context(context)
                .relate(data)
        }
        const relation = await instance
            .$relatedQuery(relationship)
            .context(context)
            .then(items => items.map(it => it.id))
        return relation
    }
}

export async function relate (
    req,
    model,
    data,
    relationship,
    context = null
): Promise<object> {
    const instance = await model
        .query()
        .context(context)
        .findById(req.params.id)
        .throwIfNotFound()

    const relations = model.getRelations()
    if (relationship in relations) {
        await instance
            .$relatedQuery(relationship)
            .context(context)
            .relate(data)
        const relation = await instance
            .$relatedQuery(relationship)
            .context(context)
            .then(items => items.map(it => it.id))
        return relation
    }
}

export async function unrelate (
    req,
    model,
    data,
    relationship,
    context = null
): Promise<object> {
    const instance = await model
        .query()
        .context(context)
        .findById(req.params.id)
        .throwIfNotFound()

    const relations = model.getRelations()
    if (relationship in relations) {
        await instance
            .$relatedQuery(relationship)
            .context(context)
            .unrelate()
            .findByIds(data)
        const relation = await instance
            .$relatedQuery(relationship)
            .context(context)
            .then(items => items.map(it => it.id))
        return relation
    }
}
