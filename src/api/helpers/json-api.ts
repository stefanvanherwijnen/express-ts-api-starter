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

export async function paginate(req, schema, model, customSchema = null): Promise<object> {
  const parsedUrl = parseUrl(req)

  const page = parsedUrl.queryParameters.page.number
  const pageSize = parsedUrl.queryParameters.page.size
  const filter = parsedUrl.queryParameters.filter

  let query = model.query().eager(parsedUrl.queryParameters.include)
  if (typeof filter === 'object') {
    for (const field in filter) {
      query.where(field, 'like', '%' + filter[field] + '%')
    }
  }
  const results = await query.page(page - 1, pageSize)

  const pageQueryString = (number): string => { return '?page[number]=' + number + '?page[size]=' + pageSize }

  const extraData = {
    topLevelLinks: {
      self: parsedUrl.baseUrl + pageQueryString(page),
      next: Number(page) < results.results.length ? parsedUrl.baseUrl + pageQueryString(Number(page) + 1) : undefined,
      previous: Number(page) > 1 ? parsedUrl.baseUrl + pageQueryString(Number(page) - 1) : undefined,
      last: parsedUrl.baseUrl + pageQueryString(Math.ceil(results.total / Number(pageSize)))
    },
    topLevelMeta: {
      total: results.total
    }
  }

  const response = await JsonSerializer.serializeAsync(schema, results.results, customSchema, extraData)
  return response
}

export async function readResource(req, schema, model): Promise<object> {
  const parsedUrl = parseUrl(req)

  const result = await model.query().eager(parsedUrl.queryParameters.include).findById(req.params.id).throwIfNotFound()
  const response = await JsonSerializer.serializeAsync(schema, result)
  return response
}

export async function patchResource(req, schema, model, data, options = null): Promise<object> {
  options = options ? options : {
    relate: true,
    unrelate: true
  }
  data.id = Number(data.id)
  const parsedUrl = parseUrl(req)
  const result = await model.query().eager(parsedUrl.queryParameters.include).upsertGraph(data, options)

  const response = await JsonSerializer.serializeAsync(schema, result)
  return response
}

export async function createResource(req, schema, model, data): Promise<object> {
  const options = {
    relate: true,
    unrelate: true
  }
  delete data.id

  const parsedUrl = parseUrl(req)
  const result = await model.query().eager(parsedUrl.queryParameters.include).insertGraph(data, options)
  const response = await JsonSerializer.serializeAsync(schema, result)
  return response
}

export async function deleteResource(req, schema, model): Promise<boolean> {
  const parsedUrl = parseUrl(req)

  const deletedRows = await model.query().eager(parsedUrl.queryParameters.include).delete().findById(req.params.id)
  return deletedRows ? true : false
}