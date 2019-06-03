#! /bin/sh
cd $(dirname $0)/..
npm run build
npm run generate test/schema.graphql test/generated/types.ts
npm run ts-type-check test/typeTest.ts
