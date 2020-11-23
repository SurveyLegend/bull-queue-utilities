const queueNames = require('./utils/init')

const pMap = require('p-map')
const sendToSlack = require('./utils/slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

const sumArray = require('./utils/sumArray')
const getFailedQueues = require('./utils/getFailedQueues')
const getAttemptedJobs = require('./utils/jobsExceedingAttemptsFilter')

console.log(`${new Date().toISOString()} - Checking for failed jobs in ${queueNames.join(', ')} queues`)

const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 50

const startTime = Date.now()

getFailedQueues(queueNames)
    .then(async queues => {
        const retriedJobCountsForEachQueue = await Promise.all(
            queues.map(async queue => {
                const failedJobs = getAttemptedJobs(await queue.getFailed())

                if (!failedJobs.length) {
                    return queue.close().then(() => 0)
                }

                const failedCount = failedJobs.length
                const retriedJobs = await pMap(
                    failedJobs,
                    async job => {
                        try {
                            await job.retry()
                            return 1
                        } catch (e) {
                            console.error(e)
                            return 0
                        }
                    },
                    { concurrency: CONCURRENCY }
                )
                const retriedJobCountInQueue = sumArray(retriedJobs)
                const text = `Retried ${retriedJobCountInQueue} of ${failedCount} failed jobs in ${queue.name} queue`
                console.log(`${Date.now() - startTime} ms - ${text}`)

                return Promise.all([
                    sendToSlack({ text }),
                    queue.close()
                ]).then(() => retriedJobCountInQueue)
            })
        )

        return sumArray(retriedJobCountsForEachQueue)
    })
    .then((retriedJobsInAllQueues) => {
        console.log(`${Date.now() - startTime} ms - Finished retrying ${retriedJobsInAllQueues} failed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        console.log(`${Date.now() - startTime} ms - Finished retrying failed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 1
    })

