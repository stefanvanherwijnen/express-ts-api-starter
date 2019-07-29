import url from 'url'
import JsonSerializer from './json-serializer'

const parseUrl = (req): {
  baseUrl: string,
  queryParameters: {
    filter: object,
    include: string,
    page: {
      number: number,
      size: number,
    },
  },
} => {
  return {
    baseUrl: url.parse(req.originalUrl).pathname,
    queryParameters: {
      filter: req.query.filter ? req.query.filter : undefined,
      include: req.query.include ? '[' + req.query.include + ']' : undefined,
      page: (req.query.page) ? {
        number: req.query.page.number ? req.query.page.number : 1,
        size: req.query.page.size ? req.query.page.size : 5
      } : {number: 1, size: 5}
    }
  }
}

export async function serialize(req, results, schema, customSchema = null): Promise<object> {
  if (req.roles) {
    req.roles.forEach((role): void => {
      if (role in JsonSerializer.schemas[schema]) {
        customSchema = role
      }
    })
  }

  let extraData = {}

  if ('results' in results) {
    const page = req.parsedUrl.queryParameters.page.number
    const pageSize = req.parsedUrl.queryParameters.page.size
    const pageQueryString = (number): string => { return '?page[number]=' + number + '?page[size]=' + pageSize }

    extraData = {
      topLevelLinks: {
        self: req.parsedUrl.baseUrl + pageQueryString(page),
        next: Number(page) < results.results.length ? req.parsedUrl.baseUrl + pageQueryString(Number(page) + 1) : undefined,
        previous: Number(page) > 1 ? req.parsedUrl.baseUrl + pageQueryString(Number(page) - 1) : undefined,
        last: req.parsedUrl.baseUrl + pageQueryString(Math.ceil(results.total / Number(pageSize)))
      },
      topLevelMeta: {
        total: results.total
      }
    }
    results = results.results
  }
  const response = await JsonSerializer.serializeAsync(schema, results, customSchema, extraData)
  return response
}

export async function paginate(req, model, context = null): Promise<object> {
  req.parsedUrl = req.parsedUrl ? req.parsedUrl :parseUrl(req)

  const page = req.parsedUrl.queryParameters.page.number
  const pageSize = req.parsedUrl.queryParameters.page.size
  const filter = req.parsedUrl.queryParameters.filter

  const query = model.query().mergeContext(context).eager(req.parsedUrl.queryParameters.include)
  if (typeof filter === 'object') {
    for (const field in filter) {
      query.where(field, 'like', '%' + filter[field] + '%')
    }
  }
  const results = await query.page(page - 1, pageSize)
  return results
}

export async function readResource(req, model, context = null): Promise<object> {
  req.parsedUrl = req.parsedUrl ? req.parsedUrl :parseUrl(req)

  const result = await model.query().mergeContext(context).eager(req.parsedUrl.queryParameters.include).findById(req.params.id).throwIfNotFound()
  return result
}

export async function patchResource(req, model, data, context = null, options = null): Promise<object> {
  options = options ? options : {
    relate: true,
    unrelate: true
  }
  data.id = Number(data.id)

  req.parsedUrl = req.parsedUrl ? req.parsedUrl :parseUrl(req)
  const result = await model.query().mergeContext(context).eager(req.parsedUrl.queryParameters.include).upsertGraph(data, options)

  return result
}

export async function createResource(req, model, data, context = null): Promise<object> {
  const options = {
    relate: true,
    unrelate: true
  }
  delete data.id

  req.parsedUrl = req.parsedUrl ? req.parsedUrl :parseUrl(req)
  const result = await model.query().mergeContext(context).eager(req.parsedUrl.queryParameters.include).insertGraph(data, options)
  return result
}

export async function deleteResource(req, model, context = null): Promise<boolean> {
  req.parsedUrl = req.parsedUrl ? req.parsedUrl :parseUrl(req)

  const rowToDelete = await model.query().mergeContext(context).eager(req.parsedUrl.queryParameters.include).findById(req.params.id)
  if (rowToDelete) {
    await rowToDelete.$query().mergeContext(context).delete()
    return true
  }
  return false
}
