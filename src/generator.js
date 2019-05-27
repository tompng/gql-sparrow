const gql = require('graphql-tag')
const fs = require('fs')
const schemaString = fs.readFileSync('test/schema.graphql').toString()
const schema = gql(schemaString)
const scalarDefinitions = []
const objectDefinitions = []
const enumDefinitions = []
const unionDefinitions = []
for (definition of schema.definitions) {
  switch (definition.kind) {
    case 'ScalarTypeDefinition':
      scalarDefinitions.push(definition)
      break
    case 'ObjectTypeDefinition':
      objectDefinitions.push(definition)
      break
    case 'EnumTypeDefinition':
      enumDefinitions.push(definition)
      break
    case 'UnionTypeDefinition':
      unionDefinitions.push(definition)
      break
    case 'InterfaceTypeDefinition':
      objectDefinitions.push(definition)
      break
    default:
      // console.error(definition)
      break
  }
}
const queryDefinition = objectDefinitions.find(d => d.name.value === 'Query')
const objectTypeNames = new Set([...objectDefinitions.map(d => d.name.value)])
function typeNameToTS(name) {
  switch(name) {
    case 'Boolean': return 'boolean'
    case 'String': return 'string'
    case 'Float': return 'number'
    case 'Int': return 'number'
    case 'Null': return 'null'
    default: return `Type${name}`
  }
  when 
}

function typeToTS(type, nonnull = false) {
  switch(type.kind) {
    case 'NamedType':
      return typeNameToTS(type.name.value) + (nonnull ? '' : ' | null')
    case 'NonNullType':
      return typeToTS(type.type, true)
    case 'ListType':
      return `(${typeToTS(type.type)})[]`
  }
}
function dataTypes() {
  const code = []
  const scalarNames = ['TypeID', ...scalarDefinitions.map(d => 'Type' + d.name.value)]
  code.push(`import { ${scalarNames.join(', ')} } from "./scalarTypes.ts"`)

  for (const definition of enumDefinitions) {
    const values = definition.values.map(type => JSON.stringify(type.name.value))
    code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
  }
  for (const definition of unionDefinitions) {
    const values = definition.types.map(type => 'Type' + type.name.value)
    code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
  }
  for (definition of objectDefinitions) {
    const typeName = `Type${definition.name.value}`
    const fieldDefinitions = definition.fields.map(field =>
      `  ${field.name.value}: ${typeToTS(field.type)}`
    )
    code.push(
      `export interface ${typeName} {`,
      ...fieldDefinitions,
      '}'
    )
  }
  return code.join("\n")
}
function extractNamedType(type) {
  if (type.kind === 'NonNullType' || type.kind === 'ListType') return extractNamedType(type.type)
  if (type.kind !== 'NamedType') return
  const name = type.name.value
  if (objectTypeNames.has(name)) return `Type${name}Query`
}

function queryTypes() {
  const code = []
  code.push('type NonAliasQuery = true | false | string | string[] | ({ field?: undefined } & { [key: string]: any })')
  for (definition of objectDefinitions) {
    const name = definition.name.value
    const typeName = `Type${name}Query`
    const baseName = `Type${name}QueryBase`
    const aliasQueryName = `Type${name}AliasFieldQuery`
    const standaloneName = `Type${name}StandaloneFields`
    const standaloneFieldNames = new Set()
    const fieldQueryType = {}
    const fieldQueryParams = {}
    for (const f of definition.fields) {
      const name = f.name.value
      const attrs = []
      const queryType = extractNamedType(f.type)
      paramsFields = f.arguments.map(a => `${a.name.value}: ${typeToTS(a.type)}`).join('; ')
      const paramsType = `{ ${paramsFields} }`
      const paramsRequired = !f.arguments.every(a => a.type.kind !== 'NonNullType')
      if (!paramsRequired) standaloneFieldNames.add(name)
      if (queryType) attrs.push(`query?: ${queryType}`)
      attrs.push(`params${paramsRequired ? '' : '?'}: ${paramsType}`)
      fieldQueryType[name] = queryType
      fieldQueryParams[name] = attrs
    }
    const acceptWildcard = standaloneFieldNames.size === definition.fields.length
    code.push(
      `export type ${typeName} = ${standaloneName} | Readonly<${standaloneName}>[]`,
      '  | (',
      `    { [key in keyof ${baseName}]?: key extends "*" ? true : ${baseName}[key] | ${aliasQueryName} }`,
      `    & { [key: string]: ${aliasQueryName} | NonAliasQuery }`,
      '  )'
    )
    code.push(
      `export type ${standaloneName} = ${[...standaloneFieldNames].map(n => JSON.stringify(n)).join(' | ') || 'never'}`
    )
    code.push(
      `export type ${aliasQueryName} =`,
      definition.fields.map(f =>
        `  | { ${[`field: "${f.name.value}"`, ...fieldQueryParams[f.name.value]].join('; ')} }`
      ).join("\n") || 'never'
    )
    code.push(`export interface ${baseName} {`)
    for (const field of definition.fields) {
      const name = field.name.value
      const types = []
      if (standaloneFieldNames.has(name)) {
        types.push('true')
        const qtype = fieldQueryType[name]
        if (qtype) types.push(qtype)
      }
      const qparams = fieldQueryParams[name]
      types.push(`{ field: never; ${qparams.join('; ')} }`)
      code.push(`  ${name}: ${types.join(' | ')}`)
    }
    if (acceptWildcard) code.push('  "*": true')
    code.push('}')
  }
  return code.join("\n")
}
console.log(dataTypes())
console.log(queryTypes())

