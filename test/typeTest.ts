import { DataTypeFromRootQuery } from './generated/types'
const query = {

}
type IsEqual<T, U> = [T, U] extends [U, T] ? NullableEqual<T, U> : false
type NullableEqual<T, U> = [null, null] extends [T, U]
  ? NonNullEquals<Exclude<T, null>, Exclude<U, null>>
  : null extends T ? false : null extends U ? false : NonNullEquals<T, U>
type NonNullEquals<T, U> = [T, U] extends [(infer T0)[], (infer U0)[]] ? ObjectEquals<T0, U0> : T extends object ? ObjectEquals<T, U> : true
type ObjectEquals<T, U> = {
  [key in keyof(T) & keyof(U)]: IsEqual<T[key], U[key]>
} extends { [key in keyof(T) & keyof(U)]: true } ? true : false
function isOK<T extends true>(): T | undefined { return }

isOK<IsEqual<
  DataTypeFromRootQuery<{
    field: 'feed',
    query: {
      ID: { field: 'id' },
      author: ['id', 'name', 'email'],
      title: true,
      content: true
      location: true
      foobar: { params: { id: 1 }, field: 'foobar' } // TODO: fix
    }
  }>,
  {
    ID: number
    author: { id: number; name: string; email: string }
    title: string
    content: string | null
    location: { lon: number; lat: number }
    foobar: string
  }[]
>>()

isOK<IsEqual<
  DataTypeFromRootQuery<{ field: 'post', params: { id: 1 }, query: {
    id: { field: 'title' }
    id2: { field: 'id' }
    title: { field: 'id' }
  } }>,
  { id: string, title: number, id2: number }
>>()
