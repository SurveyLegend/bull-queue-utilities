const Queue = require('bull')
const result = require('dotenv').config()

if (result.error) {
    throw result.error
}

const { forEach, reduce } = require('p-iteration')

const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT) || 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_DATABASE = Number.parseInt(process.env.REDIS_DATABASE) || 0
const REDIS_PASS = process.env.REDIS_PASS

const REDIS_CONFIG = {
    redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        db: REDIS_DATABASE
    }
}

if (REDIS_PASS) {
    REDIS_CONFIG.redis.password = REDIS_PASS
}

const args = process.argv.slice(2)

if (args.length < 1) {
    console.error(`${new Date().toISOString()} - No queue name specified, please specify at least one queue name.`)
    process.exit(1)
}

const sendToSlack = require('./slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

const startTime = Date.now()
console.log(`${new Date(startTime).toISOString()} - Checking for failed jobs in ${args.join(', ')} queues`)

forEach(args, async (name, index) => {
    console.log(`${Date.now() - startTime} ms - Start retrying failed jobs in ${name} queue`)

    const queue = new Queue(name, REDIS_CONFIG)

    const failedCount = await queue.getFailedCount()
    if (failedCount > 0) {
        let text = `Found ${failedCount} failed jobs in ${name} queue.`
        console.log(`${Date.now() - startTime} ms - ${text}`)
        // await sendToSlack({ text })

        const jobs = await queue.getFailed()
        const retriedJobCount = await reduce(jobs, async (count, job) => {
            try {
                await job.retry()
                count++
            } catch (e) {
                console.error(e)
            }
            return count
        }, 0)

        text = `Retrying ${retriedJobCount} of ${failedCount} failed jobs in ${name} queue`
        console.log(`${Date.now() - startTime} ms - ${text}`)
        await sendToSlack({ text })
    } else {
        console.log(`${Date.now() - startTime} ms - No jobs failed jobs in ${name} queue`)
    }

    await queue.close()
})
    .then(() => {
        console.log(`${Date.now() - startTime} ms - Finished retrying failed jobs in queues`)
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        console.log(`${Date.now() - startTime} ms - Finished retrying failed jobs in queues`)
        process.exitCode = 1
    })

