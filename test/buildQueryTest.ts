import { buildQuery, buildMutationQuery } from 'gql-sparrow'
import gql from 'graphql-tag'

function assertEqual(a: any, b: any) {
  let ca = a
  let cb = b
  if (typeof a === 'object' || typeof b === 'object') {
    ca = JSON.stringify(a)
    cb = JSON.stringify(b)
  }
  if (ca == cb) {
    console.log('ok')
    return
  }
  console.log(a)
  console.log('---')
  console.log(b)
  throw 'mismatch'
}

const query = {
  aaa: {
    params: { id: 1 },
    query: {
      a: { params: { x: 1, y: [true, { z: '3' }] } },
      b: { field: 'c' },
      b2: { field: 'b' },
      c: { field: 'b' },
      d: { query: 'p' },
      e: { params: { i: 2 }, query: 'q' },
      F: { field: 'f', params: { j: 3 } },
      G: { field: 'g', query: 'r' },
      H: { field: 'h', params: { k: 4 }, query: 's' },
      I: {
        field: 'i',
        params: { l: 4 },
        query: {
          J: { field: 'j', params: { m: 1 }, query: 't' },
          K: { field: 'k', params: { n: 1 }, query: ['u', 'v'] },
          L: { field: 'l', params: { o: 1 }, query: { w: true, x: ['y', 'z'] } },
          M: true
        }
      }
    }
  }
} as const

const expectedQuery = `query {
  aaa(id: 1) {
    a(x: 1, y: [true, {z: "3"}])
    b: c
    b2: b
    c: b
    d {
      p
    }
    e(i: 2) {
      q
    }
    F: f(j: 3)
    G: g {
      r
    }
    H: h(k: 4) {
      s
    }
    I: i(l: 4) {
      J: j(m: 1) {
        t
      }
      K: k(n: 1) {
        u
        v
      }
      L: l(o: 1) {
        w
        x {
          y
          z
        }
      }
      M
    }
  }
}`
const gqlQuery = buildQuery(query)
gql(gqlQuery)
assertEqual(gqlQuery, expectedQuery)

const mutation = {
  createDraft: {
    params: { title: 'newpost', content: 'hello', location: { lon: 0, lat: 0 } },
    query: 'id'
  },
  createComment: {
    params: { text: 'hello' },
    query: ['id', 'text']
  }
}
const expectedMutation = `mutation {
  createDraft(title: "newpost", content: "hello", location: {lon: 0, lat: 0}) {
    id
  }
  createComment(text: "hello") {
    id
    text
  }
}`
const gqlMutationQuery = buildMutationQuery(mutation)
gql(gqlMutationQuery)
assertEqual(gqlMutationQuery, expectedMutation)

import { TypeRootQuery, DataTypeFromQuery } from './generated/types'
async function executeGraphQLByYourFavoriteLibrary(_: string){ return null as unknown }
async function myExecuteQuery<Q extends TypeRootQuery>(query: Q) {
  const graphqlQuery = buildQuery(query)
  const result = await executeGraphQLByYourFavoriteLibrary(graphqlQuery)
  return result as DataTypeFromQuery<Q>
}
myExecuteQuery({})
