type QueryValue = true | string | Readonly<string[]> | AttributeQuery
type AttributeQueryValue = QueryValue | Query
type Query = { field?: string; query?: QueryValue; params?: any }
type AttributeQuery = { [key: string]: AttributeQueryValue }
type TrueIsArrayType = (arg: any) => arg is Readonly<any[]> // to avoid isArray bug in ts 3.4.5

function paramsToString(params: any, pretty: boolean, brace: boolean = true) {
  const space = pretty ? ' ' : ''
  if (Array.isArray(params)) {
    return '[' + params.map(p => paramsToString(p, pretty)).join(',' + space) + ']'
  }
  if (typeof params === 'object') {
    const fields: string[] = []
    for (const key in params) {
      if (!key.match(/^[a-zA-Z0-9_]+$/)) throw `Invalid key in params: ${JSON.stringify(key)}`
      fields.push(`${key}:${space}${paramsToString(params[key], pretty)}`)
    }
    const content = fields.join(',' + space)
    return brace ? `{${content}}` : content
  }
  return JSON.stringify(params)
}
function paramsToVarString(params: object, pretty: boolean) {
  const space = pretty ? ' ' : ''
  const fields: string[] = []
  for (const key in params) {
    if (!key.match(/^[a-zA-Z0-9_]+$/)) throw `Invalid key in params: ${JSON.stringify(key)}`
    fields.push(`${key}:${space}$${key}`)
  }
  return fields.join(',' + space)
}

function indentString(n: number) {
  return new Array(n).fill('  ').join('')
}
function buildPartialQuery(name: string | null, query: Query, qstring: string[], indentSize: number, pretty: boolean, useVarName: boolean = false) {
  const { field, query: attrQuery, params } = query
  const fieldHeaders: string[] = []
  const space = pretty ? ' ' : ''
  const indent = pretty ? indentString(indentSize) : ''
  const nextIndent = pretty ? indentString(indentSize + 1) : ''
  if (name && field) {
    fieldHeaders.push(`${name}:${space}${field}`)
  } else {
    fieldHeaders.push(`${name || field}`)
  }
  if (useVarName) {
    fieldHeaders.push(`(${paramsToVarString(params, pretty)})`)
  } else if (params) {
    fieldHeaders.push(`(${paramsToString(params, pretty, false)})`)
  }
  if (!attrQuery || attrQuery === true) {
    qstring.push(indent + fieldHeaders.join(''))
    return
  }
  qstring.push(indent + fieldHeaders.join('') + space + '{')
  if (typeof attrQuery === 'string') {
    qstring.push(nextIndent + attrQuery)
  } else if ((Array.isArray as TrueIsArrayType)(attrQuery)) {
    attrQuery.forEach(f => qstring.push(nextIndent + f))
  } else {
    buildAttributeQueryFields(attrQuery, qstring, indentSize + 1, pretty)
  }
  qstring.push(indent + '}')
}
function buildAttributeQueryFields(query: AttributeQuery, qstring: string[], indentSize: number, pretty: boolean) {
  for (const key in query) {
    const subQueryValue = query[key]
    const isQuery = (typeof subQueryValue === 'object') && (('field' in subQueryValue) || ('query' in subQueryValue) || ('params' in subQueryValue))
    const subQuery: Query = isQuery ? subQueryValue as Query : { query: subQueryValue } as Query
    buildPartialQuery(key, subQuery, qstring, indentSize, pretty)
  }
}

export interface BuildQueryOption {
  pretty?: boolean
  type?: 'mutation' | 'query'
}
export function buildQuery(query: AttributeQuery, option?: BuildQueryOption): string {
  const { pretty, type } = { pretty: true, type: 'query', ...option }
  const qstring: string[] = []
  qstring.push(`${type}${pretty ? ' ' : ''}{`)
  buildAttributeQueryFields(query, qstring, 1, pretty)
  qstring.push('}')
  return qstring.join('\n')
}
