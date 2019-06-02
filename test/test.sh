#! /bin/sh
cd $(dirname $0)
cd ..
npm run build
cd test
node ../dist/bin/typed-gqlbuilder-gen schema.graphql generated/types.ts
../node_modules/typescript/bin/tsc --strict --lib es2017 --noEmit typeTest.ts
