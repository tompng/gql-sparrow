type Query = {
  field?: string
  query?: true | string | string[] | AttributeQuery
  params?: any
}

type AttributeQuery = { [key: string]: AttributeQueryValue }
type AttributeQueryValue = true | string | string[] | Query | AttributeQuery

interface RootQuery {
  field: string
  query: Exclude<Query['query'], undefined>
  params?: any
}

function paramsToString(params: any, pretty: boolean = true, brace: boolean = true) {
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
function indentString(n: number) {
  return new Array(n).fill('  ').join('')
}
function partialQueryBuilder(name: string | null, query: Query, qstring: string[], indentSize: number, pretty: boolean) {
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
  if (params) fieldHeaders.push(`(${paramsToString(params, pretty, false)})`)
  qstring.push(indent + fieldHeaders.join('') + space + '{')
  if (attrQuery && attrQuery !== true) {
    if (typeof attrQuery === 'string') {
      qstring.push(nextIndent + attrQuery)
    } else if (Array.isArray(attrQuery)) {
      attrQuery.forEach(f => qstring.push(nextIndent + f))
    } else {
      for (const key in attrQuery) {
        const subQueryValue = attrQuery[key]
        const isQuery = (typeof subQueryValue === 'object') && (('field' in subQueryValue) || ('query' in subQueryValue) || ('params' in subQueryValue))
        const subQuery: Query = isQuery ? subQueryValue as Query : { query: subQueryValue } as Query
        partialQueryBuilder(key, subQuery, qstring, indentSize + 1, pretty)
      }
    }
  }
  qstring.push(indent + '}')
}
export function buildQuery(root: RootQuery, pretty: boolean = true): string {
  const qstring: string[] = []
  qstring.push('{')
  partialQueryBuilder(null, root, qstring, 1, pretty)
  qstring.push('}')
  return qstring.join('\n')
}
