import gql from 'graphql-tag'
import * as fs from 'fs'
import {
  GQLSchema,
  GQLScalarDefinition,
  GQLObjectDefinition,
  GQLEnumDefinition,
  GQLUnionDefinition,
  GQLType,
  GQLField
} from './types/graphql-tag'

const filename = process.argv.length >= 3 ? process.argv[2] : null
if (!filename) throw 'No input schema file.'
const schemaString = fs.readFileSync(filename).toString()
const schema = gql(schemaString) as GQLSchema
const scalarDefinitions: GQLScalarDefinition[] = []
const objectDefinitions: GQLObjectDefinition[] = []
const enumDefinitions: GQLEnumDefinition[] = []
const unionDefinitions: GQLUnionDefinition[] = []
for (const definition of schema.definitions) {
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
const rootDefinition = objectDefinitions.find(d => d.name.value === 'Query')
const objectTypeNames = new Set([...objectDefinitions.map(d => d.name.value)])
function typeNameToTS(name: string) {
  switch(name) {
    case 'Boolean': return 'boolean'
    case 'String': return 'string'
    case 'Float': return 'number'
    case 'Int': return 'number'
    case 'Null': return 'null'
    default: return `Type${name}`
  }
}

function typeToTS(type: GQLType, nonnull = false): string {
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
  const code: string[] = []
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
  for (const definition of objectDefinitions) {
    const typeName = `Type${definition.name.value}`
    const fieldDefinitions = definition.fields.map(field =>
      `  ${field.name.value}: ${typeToTS(field.type)}`
    )
    code.push(
      `export interface ${typeName} {`,
      ...fieldDefinitions,
      `  _meta?: { query: ${typeName}Query }`,
      '}'
    )
  }
  return code.join("\n")
}
function isTypeMultiple(type: GQLType): boolean {
  if (type.kind === 'NonNullType') return isTypeMultiple(type.type)
  return type.kind === 'ListType'
}

function extractNamedType(type: GQLType) {
  if (type.kind === 'NonNullType' || type.kind === 'ListType') return extractNamedType(type.type)
  if (type.kind !== 'NamedType') return
  const name = type.name.value
  if (objectTypeNames.has(name)) return `Type${name}`
}
function fieldParamsRequired(field: GQLField) {
  return !field.arguments.every(a => a.type.kind !== 'NonNullType')
}
function fieldQueryParams(field: GQLField) {
  const paramsFields = field.arguments.map(a => `${a.name.value}: ${typeToTS(a.type)}`).join('; ')
  const paramsType = `{ ${paramsFields} }`
  const objectTypeName = extractNamedType(field.type)
  const queryType = objectTypeName ? objectTypeName + 'Query' : 'true'
  const attrs: string[] = []
  if (queryType) attrs.push(`query?: ${queryType}`)
  attrs.push(`params${fieldParamsRequired(field) ? '' : '?'}: ${paramsType}`)
  return attrs
}

function queryTypes() {
  const code: string[] = []
  code.push('type NonAliasQuery = true | false | string | string[] | ({ field?: undefined } & { [key: string]: any })')
  for (const definition of objectDefinitions) {
    const name = definition.name.value
    const typeName = `Type${name}Query`
    const baseName = `Type${name}QueryBase`
    const aliasQueryName = `Type${name}AliasFieldQuery`
    const standaloneName = `Type${name}StandaloneFields`
    const standaloneFieldNames = new Set()
    for (const f of definition.fields) {
      if (!fieldParamsRequired(f)) standaloneFieldNames.add(f.name.value)
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
        `  | { ${[`field: "${f.name.value}"`, ...fieldQueryParams(f)].join('; ')} }`
      ).join("\n") || 'never'
    )
    code.push(`export interface ${baseName} {`)
    for (const field of definition.fields) {
      const name = field.name.value
      const types: string[] = []
      if (standaloneFieldNames.has(name)) {
        types.push('true')
        const objectTypeName = extractNamedType(field.type)
        if (objectTypeName) types.push(objectTypeName + 'Query')
      }
      const qparams = fieldQueryParams(field)
      types.push(`{ field: never; ${qparams.join('; ')} }`)
      code.push(`  ${name}: ${types.join(' | ')}`)
    }
    if (acceptWildcard) code.push('  "*": true')
    code.push('}')
  }
  return code.join('\n')
}
function rootQueryTypes(rootDefinition: GQLObjectDefinition) {
  const code: string[] = []
  function camelize(name: string) {
    return name.split('_').map(a => a[0].toUpperCase() + a.substr(1)).join('')
  }
  const rootFields: { field: string; query: string }[] = []
  for (const field of rootDefinition.fields) {
    const name = field.name.value
    const queryName = `TypeRoot${camelize(name)}Query`
    rootFields.push({ field: name, query: queryName })
    const attr = [
      `field: "${name}"`,
      ...fieldQueryParams(field),
      `_meta?: { data: ${extractNamedType(field.type)}${isTypeMultiple(field.type) ? '[]' : ''} }`
    ]
    code.push(`export interface ${queryName} { ${attr.join('; ')} }`)
  }
  code.push(
    'export interface TypeRootFields {',
    ...rootFields.map(({ field, query }) => `  ${field}: ${query}`),
    '}'
  )
  return code.join('\n')
}
if (!rootDefinition) throw '`type Query` not found'
console.log(`
import { DataTypeFromRequest } from '[ts_gql_tmp(may change)]/DataType'
type Values<T> = T extends { [K in keyof T]: infer U } ? U : never
export type DataTypeFromRootQuery<RQ extends Values<TypeRootFields>> =
  DataTypeFromRequest<TypeRootFields[RQ['field']], RQ>
`)
console.log(dataTypes())
console.log(queryTypes())
console.log(rootQueryTypes(rootDefinition))
