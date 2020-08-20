const queueNames = require('./utils/init')

const sendToSlack = require('./utils/slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

const sumArray = require('./utils/sumArray')
const getQueues = require('./utils/getQueues')

const JOB_AGE = Number.parseInt(process.env.JOB_AGE) || 5000

const startTime = Date.now()

console.log(`${new Date().toISOString()} - Checking for completed jobs in ${queueNames.join(', ')} queues`)

getQueues(queueNames)
    .then(async queues => {
        const operations = queues.map(queue => {
            console.log(`${Date.now() - startTime} ms - Start cleaning completed jobs in ${queue.name} queue`)

            return new Promise(resolve => {
                queue.on('cleaned', async (jobs, type) => {
                    // jobs is an array of cleaned jobs
                    const text = `Cleaned ${jobs.length} ${type} jobs in ${queue.name}.`
                    const jobIds = jobs.map(job => job && job === typeof 'object' && job.id ? job.id : job)

                    console.log(`${Date.now() - startTime} ms - ${text}`)
                    await Promise.all([
                        sendToSlack({ text }),
                        queue.close()
                    ])
                    resolve(jobIds.length)
                })
                queue.clean(JOB_AGE) // start cleaning jobs older than JOB_AGE
            })
        })
        return Promise.all(operations)
    })
    .then(sumArray)
    .then(cleanedJobCount => {
        console.log(`${Date.now() - startTime} ms - Finished cleaning ${cleanedJobCount} completed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 0
    })
    .catch(err => {
        console.error(err)
        console.log(`${Date.now() - startTime} ms - Finished cleaning some completed jobs in ${queueNames.join(', ')} queues`)
        process.exitCode = 1
    })

