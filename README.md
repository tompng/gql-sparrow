# GraphQL Query Builder for typescript

## 1. Generate type from schema.graphql

```sh
% node dist/generator.js foobar/schema.graphql > foo/bar/generated_types.ts
```

If you have custom scalar types, define it to `foo/bar/customScalarTypes.ts`
```ts
// if `scalar Foo` is `number` in typescript
export TypeFoo = number
```

## 2. Write glue code
```ts
import { DataTypeFromRootQuery, TypeRootQuery } from 'foo/bar/generated_types'
import { buidQuery, buildMutationQuery } from '[gql_ts_tmp(may change)]'
async function myExecuteQuery<Q extends TypeRootQuery>(query: Q) {
  const graphqlQuery = buildQuery(query)
  const result = await executeGraphQLByYourFavoriteLibrary(graphqlQuery)
  return result as DataTypeFromRootQuery<Q>
}
```

## 3. Write query in plain js object
```ts
const query = {
  field: 'feed',
  params: { foo: 'bar' },
  query: {
    id: true,
    author: 'name',
    Title: { field: 'title' },
    Comments: {
      field: 'comments',
      params: { userId: 123 },
      query: ['id', 'text']
    }
  }
} as const
```

## 4. Then you'll get a nice type support.
```ts
const result = await myExecuteQuery(query)
result.author // => { name: string }
const article = await myExecuteQuery({ field: 'article', params: { id: 1 }, query: ['id', 'title'] })
article.id // => number
article.title // => string
article.author // => compile error
```

## Examples
```ts
// Query & Types
type QueryResult = DataTypeFromRootQuery<typeof query>
// {
//   id: number
//   author: { name: string }
//   Title: string
//   Comments: { id: number; text: string }[]
// }
const graphqlQuery = buildQuery(query)
// {
//   feed(foo: "bar") {
//     id
//     author {
//       name
//     }
//     Title: title
//     Comments: comments(userId: 123) {
//       id
//       text
//     }
//   }
// }
```

```ts
// Mutations
import { DataTypeFromRootMutation, TypeRootMutation } from 'foo/bar/generated_types'
const mutationQuery = { field: 'createPost', params: { title: 'aaa' }, query: ['id'] }
const [graphqlMutationQuery, variables] = buildMutationQuery(mutationQuery)
type QueryResult = DataTypeFromRootMutation<typeof mutationQuery>
// { id: number }
graphqlMutationQuery
// mutation {
//   createpost(title: $title) {
//     id
//   }
// }
variables
// { title: "aaa" }
```

```ts
// Warnings: if you specify an undefined field.
const article = await myExecuteQuery({
  field: 'article',
  params: { id: 1 },
  query: {
    id: true,
    titllllle: true,
    comments: {
      user: ['id', 'name'],
      text: true,
      creeeeeeatedAt: true
    }
  }
})
article.title // compile error
// typeof article is { error: { extraFields: 'titllllle' | 'creeeeeeatedAt' } }
```
