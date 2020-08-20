const result = require('dotenv').config()

if (result.error) {
    throw result.error
}

const args = process.argv.slice(2)

if (args.length < 1) {
    console.error(`${new Date().toISOString()} - No queue name specified, please specify at least one queue name.`)
    process.exit(1)
}

module.exports = args
