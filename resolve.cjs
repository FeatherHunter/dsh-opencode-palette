const fs = require('node:fs')
const p = 'scripts/build-client.ts'
let s = fs.readFileSync(p, 'utf8')
const before = "'resolve', 'map-dsh',"
if (!s.includes(before)) { console.error('ANCHOR NOT FOUND'); process.exit(2) }
s = s.replace(before, "'resolve', 'pair-contrast', 'map-dsh',")
fs.writeFileSync(p, s)
console.log('resolved build-client.ts')
