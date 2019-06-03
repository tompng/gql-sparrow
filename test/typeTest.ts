import { DataTypeFromRootQuery } from './generated/types'

type IsEqual<T, U> = [T, U] extends [U, T] ? true : false
function isOK<T extends true>(): T | undefined { return }
type IsStrictMode = string | null extends string ? false : true
isOK<IsStrictMode>()

isOK<IsEqual<
  DataTypeFromRootQuery<{ field: 'feed'; query: { title: true } }>,
  { title: string }[]
>>()
isOK<IsEqual<
  DataTypeFromRootQuery<{ field: 'feed'; query: 'title' }>,
  { title: string }[]
>>()
isOK<IsEqual<
  DataTypeFromRootQuery<{ field: 'feed'; query: ['id', 'title'] }>,
  { id: number; title: string }[]
>>()

isOK<IsEqual<
  DataTypeFromRootQuery<{
    field: 'feed'
    query: {
      ID: { field: 'id' }
      author: ['id', 'name', 'email']
      title: true,
      content: true
      location: true
      foobar: { params: { id: 1 } }
    }
  }>,
  {
    ID: number
    author: { id: number; name: string | null; email: string }
    title: string
    content: string | null
    location: { lon: number; lat: number } | null
    foobar: string
  }[]
>>()

isOK<IsEqual<
  DataTypeFromRootQuery<{ field: 'post'; params: { id: 1 }; query: {
    id: { field: 'title' }
    id2: { field: 'id' }
    title: { field: 'id' }
    foobar: { field: 'id' }
    author: { field: 'foobar'; params: { id: 1 } }
  } }>,
  { id: string; title: number; id2: number; foobar: number; author: string }
>>()
