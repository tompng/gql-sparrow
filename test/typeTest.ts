import { DataTypeFromQuery, DataTypeFromMutation } from './generated/types'

type IsEqual<T, U> = [T, U] extends [U, T] ? true : false
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
        title: true,
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

isOK<IsEqual<DataTypeFromMutation<{
    createDraft: {
      params: { title: 'newpost', content: 'hello', location: { lon: 0, lat: 0 } },
      query: 'id'
    }
  }>,
  { createDraft: { id: string } }
>>()
