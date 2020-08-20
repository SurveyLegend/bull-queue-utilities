const getQueues = require('./getQueues')
//const sendToSlack = require('./slack')(process.env.SLACK_WEBHOOK_URL, process.env.SLACK_CHANNEL)

module.exports = async queueNames => {
    const startTime = Date.now()

    return getQueues(
        queueNames,
        async queue => {
            console.log(`${Date.now() - startTime} ms - Start cleaning stacks for failed jobs in ${queue.name} queue`)
            const failedCount = await queue.getFailedCount()
            if (!failedCount) {
                console.log(`${Date.now() - startTime} ms - No failed jobs in ${queue.name} queue`)
                await queue.close()
                return null
            }

            const text = `Found ${failedCount} failed jobs in ${queue.name} queue.`
            console.log(`${Date.now() - startTime} ms - ${text}`)
            // await sendToSlack({ text })
            return queue
        }
    )
}
