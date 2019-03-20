const Queue = require('bull')
const result = require('dotenv').config()

if (result.error) {
    throw result.error
}

const { forEach, reduce } = require('p-iteration')

const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT) || 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_DATABASE = Number.parseInt(process.env.REDIS_DATABASE) || 0

const REDIS_CONFIG = {
    redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        db: REDIS_DATABASE
    }
}

const args = process.argv.slice(2)

if (args.length < 1) {
    console.error('No queue name specified, please specify at least one queue name.')
    process.exit(1)
}

let devOps = async () => true
if (process.env.SLACK_WEBHOOK_URL && process.env.SLACK_CHANNEL) {
    const slack = require('slack-notify')(process.env.SLACK_WEBHOOK_URL)
    devOps = slack.extend({
        channel: process.env.SLACK_CHANNEL,
        icon_emoji: ':computer:',
        username: 'Bull Queue Bot'
    })
}

forEach(args, async (name, index) => {
    console.log(`Start retrying failed jobs in ${name} queue`)

    const queue = new Queue(name, REDIS_CONFIG)

    const failedCount = await queue.getFailedCount()
    if (failedCount > 0) {
        let text = `Found ${failedCount} failed jobs in ${name} queue.`
        console.log(text)
        await devOps({
            text
            /*
            fields: {
                'CPU usage': '7.51%',
                'Memory usage': '254mb'
            }
            */
        })

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
        console.log(text)
        await devOps({
            text
        })
    }

    console.log(`Finished retrying failed jobs in ${name} queue`)

    return await queue.close()
})
    .then(() => {
        console.log('Finished retrying failed jobs in queues')
        process.exit()
    })
    .catch(err => {
        console.error(err)
        process.exit(2)
    })

