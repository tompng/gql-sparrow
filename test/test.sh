#! /bin/sh
cd $(dirname $0)/..
npm run build

# type test
npm run generate test/schema.graphql test/generated/types.ts
npm run ts-type-check test/typeTest.ts

# builder test
npm run build test/builderTest.ts
node test/builderTest.js
