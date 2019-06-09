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

const TypeNameOverrides = {
  Query: 'TypeQueryObject',
  Mutation: 'TypeMutationObject'
}

const QueryNameOverrides = {
  Query: 'TypeRootQuery'
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
    const scalarNames = this.scalarDefinitions.map(d => 'Type' + d.name.value)
    code.push(`import { ${scalarNames.join(', ')} } from "./customScalarTypes"`)
    code.push('type TypeID = string')

    for (const definition of this.enumDefinitions) {
      const values = definition.values.map(type => JSON.stringify(type.name.value))
      code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
    }
    for (const definition of this.unionDefinitions) {
      const values = definition.types.map(type => 'Type' + type.name.value)
      code.push(`export type Type${definition.name.value} = ${values.join(' | ')}`)
    }
    for (const definition of this.objectDefinitions) {
      const name = definition.name.value
      const typeName = TypeNameOverrides[name] || `Type${name}`
      const queryName = QueryNameOverrides[name] || `Type${name}Query`
      const fieldDefinitions = definition.fields.map(field =>
        `  ${field.name.value}: ${typeToTS(field.type)}`
      )
      code.push(
        `export interface ${typeName} {`,
        ...fieldDefinitions,
        `  _meta?: { query: ${queryName} }`,
        '}'
      )
    }
    return code.join("\n")
  }

  extractNamedType(type: GQLType) {
    if (type.kind === 'NonNullType' || type.kind === 'ListType') return this.extractNamedType(type.type)
    if (type.kind !== 'NamedType') return
    const name = type.name.value
    if (this.objectTypeNames.has(name)) return TypeNameOverrides[name] || `Type${name}`
  }

  fieldParamsRequired(field: GQLField) {
    return !field.arguments.every(a => a.type.kind !== 'NonNullType')
  }

  fieldQueryParams(field: GQLField) {
    const paramsFields = field.arguments.map(a => `${a.name.value}: ${typeToTS(a.type)}`).join('; ')
    const objectTypeName = this.extractNamedType(field.type)
    const queryType = objectTypeName && objectTypeName + 'Query'
    if (!queryType && !paramsFields) return []
    const attrs: string[] = []
    attrs.push(`query?: ${queryType || 'never'}`)
    const paramsType = paramsFields ? `{ ${paramsFields} }` : 'never'
    attrs.push(`params${this.fieldParamsRequired(field) ? '' : '?'}: ${paramsType}`)
    return attrs
  }

  queryTypes() {
    const code: string[] = []
    const nameOverrides = { Query: 'Root' }
    code.push('type NonAliasQuery = true | string | string[] | ({ field?: undefined } & { [key: string]: any })')
    for (const definition of this.objectDefinitions) {
      const name = nameOverrides[definition.name.value] || definition.name.value
      const typeName = QueryNameOverrides[name] || `Type${name}Query`
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
        if (qparams.length !== 0) types.push(`{ field?: never; ${qparams.join('; ')} }`)
        code.push(`  ${name}: ${types.join(' | ')}`)
      }
      if (acceptWildcard) code.push('  "*": true')
      code.push('}')
    }
    return code.join('\n')
  }

  generate() {
    const query = this.findDefinition('Query')
    if (!query) throw 'type Query not found in schema'
    const mutation = this.findDefinition('Mutation')
    const definitions = [
      'import { DataTypeFromQueryPair } from "gql-sparrow/DataType"',
      this.dataTypes() + '\n',
      this.queryTypes() + '\n',
      'export type DataTypeFromQuery<RQ extends TypeRootQuery> =',
      '  DataTypeFromQueryPair<TypeQueryObject, RQ>',
    ]
    if (mutation) {
      definitions.push(
        'export type DataTypeFromMutation<RQ extends TypeMutationQuery> =',
        '  DataTypeFromQueryPair<TypeMutationObject, RQ>',
      )
    }
    return definitions.join('\n')
  }
}

export function generate(schema: string) {
  return new Generator(schema).generate()
}
