# GraphQL Query Builder for typescript

## 1. Generate type from schema.graphql
```sh
% some_workinprogress_command schema.graphql ./generated_ts_dir
```

## 2. Write query in plain js object
```ts
const query = {
  field: 'feed',
  params: { foo: 'bar' }
  query: {
    id: true,
    author: 'name',
    Title: { field: 'title' }
    Comments: {
      field: 'comments',
      params: { userId: 123 }
      query: ['id', 'text']
    }
  }
} as const
```

## 3. Write glue code
```ts
async function executeQuery<Q extends TypeRootQuery>(query: Q) {
  const graphqlQuery = workInProgressQueryBuilderFunction(query)
  const result = await executeGraphQLByYourFavoriteLibrary(graphqlQuery)
  return result as WorkInProgressGenericType<Q>
}
```
## 4. Then you'll get a nice type support.
```ts
const result = await executeQuery(query)
result.author // => { name: string }
const article = await executeQuery({ field: 'article', params: { id: 1 }, query: ['id', 'title'])
article.id // => number
article.title // => string
article.author // => compile error
```

```ts
type QueryResult = WorkInProgressGenericType<typeof query>
// {
//   id: number
//   author: { name: string }
//   Title: string
//   Comments: { id: number; text: string }[]
// }
const graphqlQuery = workInProgressQueryBuilderFunction(query)
// query {
//   feed(foo: 'bar') {
//     id
//     author { name }
//     Title: title
//     Comments: comments(userId: 123) { id, text }
//   }
// }
```
