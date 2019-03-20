const Queue = require('bull')

const result = require('dotenv').config()
if (result.error) {
    throw result.error
}

const { forEach } = require('p-iteration')

const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT) || 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_DATABASE = Number.parseInt(process.env.REDIS_DATABASE) || 0

const JOB_AGE = Number.parseInt(process.env.JOB_AGE) || 5000

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

let sendToSlack = async () => true
if (process.env.SLACK_WEBHOOK_URL && process.env.SLACK_CHANNEL) {
    const Slack = require('slack-notify')(process.env.SLACK_WEBHOOK_URL)
    const slack = Slack.extend({
        channel: process.env.SLACK_CHANNEL,
        icon_emoji: ':computer:',
        username: 'Bull Queue Bot'
    })

    sendToSlack = options => {
        return new Promise((resolve, reject) => {
            slack(options, resolve)
        })
    }
}

forEach(args, async (name) => {
    console.log(`Start cleaning completed jobs in ${name} queue`)

    const queue = new Queue(name, REDIS_CONFIG)

    queue.on('cleaned', async (job, type) => {
        const text = `Cleaned ${job.length} ${type} jobs in ${name}.`
        console.log(text)
        await sendToSlack({ text })
        await queue.close()
    })

    await queue.clean(JOB_AGE)

    console.log(`Finished cleaning completed jobs in ${name} queue`)
})
    .then(() => {
        console.log('Finished cleaning completed jobs in queues')
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        process.exitCode = 2
    })

