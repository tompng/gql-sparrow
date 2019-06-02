import gql from 'graphql-tag'

import {
  GQLSchema,
  GQLScalarDefinition,
  GQLObjectDefinition,
  GQLEnumDefinition,
  GQLUnionDefinition,
  GQLType,
  GQLField
} from './graphqlTagTypes'

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

function isTypeMultiple(type: GQLType): boolean {
  if (type.kind === 'NonNullType') return isTypeMultiple(type.type)
  return type.kind === 'ListType'
}

export class Generator {
  scalarDefinitions: GQLScalarDefinition[] = []
  objectDefinitions: GQLObjectDefinition[] = []
  enumDefinitions: GQLEnumDefinition[] = []
  unionDefinitions: GQLUnionDefinition[] = []
  objectTypeNames = new Set<string>()

  constructor(schemaString: string) {
    const schema = gql(schemaString) as GQLSchema
    for (const definition of schema.definitions) {
      switch (definition.kind) {
        case 'ScalarTypeDefinition':
          this.scalarDefinitions.push(definition)
          break
        case 'ObjectTypeDefinition':
          this.objectDefinitions.push(definition)
          break
        case 'EnumTypeDefinition':
          this.enumDefinitions.push(definition)
          break
        case 'UnionTypeDefinition':
          this.unionDefinitions.push(definition)
          break
        case 'InterfaceTypeDefinition':
          this.objectDefinitions.push(definition)
          break
        default:
          // console.error(definition)
          break
      }
    }
    for (const defs of this.objectDefinitions) {
      this.objectTypeNames.add(defs.name.value)
    }
  }

  findDefinition(name: string) {
    return this.objectDefinitions.find(d => d.name.value === name)
  }

  dataTypes() {
    const code: string[] = []
    const scalarNames = ['TypeID', ...this.scalarDefinitions.map(d => 'Type' + d.name.value)]
    code.push(`import { ${scalarNames.join(', ')} } from "./customScalarTypes"`)

    for (const definition of this.enumDefinitions) {
      const values = definition.values.map(type => JSON.stringify(type.name.value))
      code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
    }
    for (const definition of this.unionDefinitions) {
      const values = definition.types.map(type => 'Type' + type.name.value)
      code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
    }
    for (const definition of this.objectDefinitions) {
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

  extractNamedType(type: GQLType) {
    if (type.kind === 'NonNullType' || type.kind === 'ListType') return this.extractNamedType(type.type)
    if (type.kind !== 'NamedType') return
    const name = type.name.value
    if (this.objectTypeNames.has(name)) return `Type${name}`
  }

  fieldParamsRequired(field: GQLField) {
    return !field.arguments.every(a => a.type.kind !== 'NonNullType')
  }

  fieldQueryParams(field: GQLField) {
    const paramsFields = field.arguments.map(a => `${a.name.value}: ${typeToTS(a.type)}`).join('; ')
    const paramsType = `{ ${paramsFields} }`
    const objectTypeName = this.extractNamedType(field.type)
    const queryType = objectTypeName ? objectTypeName + 'Query' : 'true'
    const attrs: string[] = []
    if (queryType) attrs.push(`query?: ${queryType}`)
    attrs.push(`params${this.fieldParamsRequired(field) ? '' : '?'}: ${paramsType}`)
    return attrs
  }

  queryTypes() {
    const code: string[] = []
    code.push('type NonAliasQuery = true | false | string | string[] | ({ field?: undefined } & { [key: string]: any })')
    for (const definition of this.objectDefinitions) {
      const name = definition.name.value
      const typeName = `Type${name}Query`
      const baseName = `Type${name}QueryBase`
      const aliasQueryName = `Type${name}AliasFieldQuery`
      const standaloneName = `Type${name}StandaloneFields`
      const standaloneFieldNames = new Set()
      for (const f of definition.fields) {
        if (!this.fieldParamsRequired(f)) standaloneFieldNames.add(f.name.value)
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
          `  | { ${[`field: "${f.name.value}"`, ...this.fieldQueryParams(f)].join('; ')} }`
        ).join("\n") || 'never'
      )
      code.push(`export interface ${baseName} {`)
      for (const field of definition.fields) {
        const name = field.name.value
        const types: string[] = []
        if (standaloneFieldNames.has(name)) {
          types.push('true')
          const objectTypeName = this.extractNamedType(field.type)
          if (objectTypeName) types.push(objectTypeName + 'Query')
        }
        const qparams = this.fieldQueryParams(field)
        types.push(`{ field: never; ${qparams.join('; ')} }`)
        code.push(`  ${name}: ${types.join(' | ')}`)
      }
      if (acceptWildcard) code.push('  "*": true')
      code.push('}')
    }
    return code.join('\n')
  }

  rootQueryTypes(rootDefinition: GQLObjectDefinition) {
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
        ...this.fieldQueryParams(field),
        `_meta?: { data: ${this.extractNamedType(field.type)}${isTypeMultiple(field.type) ? '[]' : ''} }`
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

  generate() {
    const query = this.findDefinition('Query')
    // const mutation = this.findDefinition('Mutation')
    if (!query) throw 'type Query not found in schema'
    return [
      'import { DataTypeFromRequest } from "typed-gqlbuilder/DataType"',
      this.dataTypes() + '\n',
      this.queryTypes() + '\n',
      this.rootQueryTypes(query) + '\n',
      'type Values<T> = T extends { [K in keyof T]: infer U } ? U : never',
      'export type DataTypeFromRootQuery<RQ extends Values<TypeRootFields>> =',
      '  DataTypeFromRequest<TypeRootFields[RQ["field"]], RQ>',
    ].join('\n')
  }
}

export function generate(schema: string) {
  return new Generator(schema).generate()
}
