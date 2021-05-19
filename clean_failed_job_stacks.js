const queueNames = require('./utils/init')

const pMap = require('p-map')
const sendToSlack = require('./utils/slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

const sumArray = require('./utils/sumArray')
const getFailedQueues = require('./utils/getFailedQueues')
const getJobsWithAttemptLimit = require('./utils/jobAttemptsFilter')

console.log(`${new Date().toISOString()} - Checking for failed jobs in ${queueNames.join(', ')} queues`)

const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 50

const startTime = Date.now()

getFailedQueues(queueNames)
    .then(async queues => {
        const retriedJobCountsForEachQueue = await Promise.all(
            queues.map(async queue => {
                const failedJobsAboveAttemptLimit = getJobsWithAttemptLimit(await queue.getFailed(), true)

                if (!failedJobsAboveAttemptLimit.length) {
                    return queue.close().then(() => 0)
                }

                const failedCount = failedJobsAboveAttemptLimit.length
                const retriedJobs = await pMap(
                    failedJobsAboveAttemptLimit,
                    async job => {
                        const { id, data, opts } = job
                        opts.jobId = id
                        try {
                            await job.remove()
                            const rescheduled = await queue.add(data, opts)
                            return 1
                        } catch (e) {
                            console.error(e)
                            return 0
                        }
                    },
                    { concurrency: CONCURRENCY }
                )
                const retriedJobCountInQueue = sumArray(retriedJobs)
                const text = `Cleaned stack traces for ${retriedJobCountInQueue} of ${failedCount} failed jobs in ${queue.name} queue`
                console.log(`${Date.now() - startTime} ms - ${text}`)

                return Promise.all([
                    sendToSlack({ text }),
                    queue.close()
                ]).then(() => retriedJobCountInQueue)
            })
        )

        return sumArray(retriedJobCountsForEachQueue)
})
    .then(retriedJobsInAllQueues => {
        console.log(`${Date.now() - startTime} ms - Finished cleaning stacks for ${retriedJobsInAllQueues} failed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        console.log(`${Date.now() - startTime} ms - Finished cleaning stacks for some failed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 1
    })
