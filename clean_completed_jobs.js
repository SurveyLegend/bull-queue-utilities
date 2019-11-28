const Queue = require('bull')

const result = require('dotenv').config()
if (result.error) {
    throw result.error
}

const { forEach } = require('p-iteration')

const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT) || 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_DATABASE = Number.parseInt(process.env.REDIS_DATABASE) || 0
const REDIS_PASS = process.env.REDIS_PASS
const REDIS_TLS = process.env.REDIS_TLS && `${process.env.REDIS_TLS}` === 'true'

const JOB_AGE = Number.parseInt(process.env.JOB_AGE) || 5000

const REDIS_CONFIG = {
    redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        db: REDIS_DATABASE,
        password: REDIS_PASS,
        tls: REDIS_TLS ? {} : null
    }
}

const args = process.argv.slice(2)

if (args.length < 1) {
    console.error(`${new Date().toISOString()} - No queue name specified, please specify at least one queue name.`)
    process.exit(1)
}

const sendToSlack = require('./slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

const startTime = Date.now()
console.log(`${new Date(startTime).toISOString()} - Start cleaning completed jobs in ${args.join(', ')} queues`)

forEach(args, async (name) => {
    console.log(`${Date.now() - startTime} ms - Start cleaning completed jobs in ${name} queue`)

    const queue = new Queue(name, REDIS_CONFIG)

    queue.on('cleaned', async (jobs, type) => {
        // jobs is an array of cleaned jobs
        const text = `Cleaned ${jobs.length} ${type} jobs in ${name}.`
        const jobIds = jobs.map(job => job && job === typeof 'object' && job.id ? job.id : job)

        console.log(`${Date.now() - startTime} ms - ${text}`, jobIds)
        await sendToSlack({
            text,
            jobs: jobIds
            //type // the type of jobs cleaned })
        })

        await queue.close()
    })

    await queue.clean(JOB_AGE)

    console.log(`${Date.now() - startTime} ms - Finished cleaning completed jobs in ${name} queue`)
})
    .then(() => {
        console.log(`${Date.now() - startTime} ms - Finished cleaning completed jobs in queues`)
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        console.log(`${Date.now() - startTime} ms - Finished cleaning completed jobs in queues`)
        process.exitCode = 2
    })

