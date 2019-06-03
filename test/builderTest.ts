import { buildQuery } from "typed-gqlbuilder/buildQuery"
import gql from 'graphql-tag'

const query = {
  field: 'aaa',
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
} as const

const expectedQuery = `{
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
if (gqlQuery != expectedQuery) {
  console.log(gqlQuery)
  console.log('---')
  console.log(expectedQuery)
  throw 'built wrong query'
}
gql(gqlQuery)
