export interface GQLSchema {
  definitions: GQLDefinition[]
}

export type GQLDefinition =
  | GQLScalarDefinition
  | GQLObjectDefinition
  | GQLEnumDefinition
  | GQLUnionDefinition

export type GQLType =
  | { kind: 'NonNullType'; type: GQLType }
  | { kind: 'ListType'; type: GQLType }
  | { kind: 'NamedType'; name: { value: string } }
export interface GQLField {
  name: { value: string }
  type: GQLType
  arguments: { name: { value: string }; type: GQLType }[]
}

interface GQLBaseDefinition {
  kind: string
  name: { value: string }
}
export interface GQLScalarDefinition extends GQLBaseDefinition {
  kind: 'ScalarTypeDefinition'
}
export interface GQLObjectDefinition extends GQLBaseDefinition {
  kind: 'ObjectTypeDefinition' | 'InterfaceTypeDefinition'
  fields: GQLField[]
}
export interface GQLEnumDefinition extends GQLBaseDefinition {
  kind: 'EnumTypeDefinition'
  values: { name: { value: string } }[]
}
export interface GQLUnionDefinition extends GQLBaseDefinition {
  kind: 'UnionTypeDefinition'
  types: { name: { value: string } }[]
}
