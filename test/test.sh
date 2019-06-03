#! /bin/sh
cd $(dirname $0)/..
npm run build
npm run generate
cd test
../node_modules/typescript/bin/tsc --strict --lib es2017 --noEmit typeTest.ts
