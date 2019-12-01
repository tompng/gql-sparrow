import { DataTypeFromQuery, DataTypeFromMutation } from './generated/types'

type IsNotAny<T> = { _i_am_any: never } extends T ? false : true
type IsEqual<T, U> = [T, U] extends [U, T] ? IsNotAny<T | U> : false
function isOK<T extends true>(): T | undefined { return }
type IsStrictMode = string | null extends string ? false : true
isOK<IsStrictMode>()

isOK<IsEqual<
  DataTypeFromQuery<{ 'feed': { title: true } }>,
  { feed: { title: string }[]}
>>()
isOK<IsEqual<
  DataTypeFromQuery<{ 'feed': 'title' }>,
  { feed: { title: string }[]}
>>()
isOK<IsEqual<
  DataTypeFromQuery<{ 'feed': ['id', 'title'] }>,
  { feed: { id: string; title: string }[]}
>>()

isOK<IsEqual<
  DataTypeFromQuery<{
    articles: {
      field: 'feed'
      query: {
        ID: { field: 'id' }
        author: ['id', 'name', 'email']
        title: true
        content: true
        location: true
        foobar: { params: { id: '1' } }
      }
    }
  }>,
  {
    articles: {
      ID: string
      author: { id: string; name: string | null; email: string }
      title: string
      content: string | null
      location: { lon: number; lat: number } | null
      foobar: string
    }[]
  }
>>()

isOK<IsEqual<
  DataTypeFromQuery<{
    post: {
      params: { id: '1' }
      query: {
        id: { field: 'content' }
        id2: { field: 'id' }
        content: { field: 'id' }
        foobar: { field: 'id' }
        author: { field: 'foobar'; params: { id: '1' } }
      }
    }
  }>,
  { post: { id: string | null; content: string; id2: string; foobar: string; author: string } | null }
>>()

isOK<IsEqual<
  DataTypeFromQuery<{
    post: {
      params: {id: '1' }
      query: {
        author: 'name'
        author1: { field: 'author'; query: 'name' }
        author2: { field: 'author'; query: ['name'] }
        author3: { field: 'author'; query: { name: true } }
        maybeAuthor: 'name'
        maybeAuthor1: {
          field: 'maybeAuthor'
          query: 'name'
        }
        maybeAuthor2: {
          field: 'maybeAuthor'
          query: ['name']
        }
        maybeAuthor3: {
          field: 'maybeAuthor'
          query: { name: true }
        }
      }
    }
  }>,
  {
    post: {
      author: { name: string | null }
      author1: { name: string | null }
      author2: { name: string | null }
      author3: { name: string | null }
      maybeAuthor: { name: string | null } | null
      maybeAuthor1: { name: string | null } | null
      maybeAuthor2: { name: string | null } | null
      maybeAuthor3: { name: string | null } | null
    } | null
  }
>>()

isOK<IsEqual<DataTypeFromMutation<{
    createDraft: {
      params: { title: 'newpost', content: 'hello', location: { lon: 0, lat: 0 } },
      query: 'id'
    }
  }>,
  { createDraft: { id: string } }
>>()

isOK<IsEqual<
  DataTypeFromQuery<{ feed: { id: true, author: { id: true, namae: true }, titleee: true } }>,
  { error: { extraFields: 'namae' | 'titleee' } }
>>()

isOK<IsEqual<
  DataTypeFromQuery<{ post: { params: { id: '1' }, query: { idd: true, titleee: true } } }>,
  { error: { extraFields: 'idd' | 'titleee' } }
>>()
