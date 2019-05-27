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
      console.error(definition)
      break
  }
}
const queryDefinition = objectDefinitions.find(d => d.name.value === 'Query')
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
  code.push(`import { ${scalarNames.join(', ')} } from ./scalarTypes.ts`)

  for (const definition of enumDefinitions) {
    const values = definition.values.map(type => JSON.stringify(type.name.value))
    code.push(`type Type${definition.name.value} = ${values.join(' | ')}`)
  }
  for (const definition of unionDefinitions) {
    const values = definition.types.map(type => 'Type' + type.name.value)
    code.push(`type Type${definition.name.value} = ${values.join(' | ')}`)
  }
  for (definition of objectDefinitions) {
    const typeName = `Type${definition.name.value}`
    const fieldDefinitions = definition.fields.map(field =>
      `  ${field.name.value}: ${typeToTS(field.type)}`
    )
    code.push(
      `interface ${typeName} {`,
      ...fieldDefinitions,
      '}'
    )
  }
  return code.join("\n")
}

console.log(dataTypes())
console.error(queryDefinition)
