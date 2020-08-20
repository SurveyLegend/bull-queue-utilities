const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT) || 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_DATABASE = Number.parseInt(process.env.REDIS_DATABASE) || 0
const REDIS_PASS = process.env.REDIS_PASS
const REDIS_TLS = process.env.REDIS_TLS && `${process.env.REDIS_TLS}` === 'true'

const REDIS_CONFIG = {
    redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        db: REDIS_DATABASE,
        password: REDIS_PASS,
        tls: REDIS_TLS ? {} : null
    }
}

const Queue = require('bull')

module.exports = async (queueNames, filterFn = async queue => queue) => {
    const queues = await Promise.all(queueNames.map(async name => filterFn(new Queue(name, REDIS_CONFIG))))
    return queues.filter(q => !!q)
}
