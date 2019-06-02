import * as fs from 'fs'
import { generate } from './generator'
const inputFile = process.argv.length >= 3 ? process.argv[2] : null
if (!inputFile) throw 'No input schema file. arg1: input-schema-file, arg2?: output-ts-file'
const schemaString = fs.readFileSync(inputFile).toString()
const outputFile = process.argv.length >= 4 ? process.argv[3] : null
const output = generate(schemaString)
if (outputFile) {
  if (!outputFile.match(/\.ts$/)) throw 'Output file must match /.ts$/'
  fs.writeFileSync(outputFile, output)
} else {
  console.log(output)
}
