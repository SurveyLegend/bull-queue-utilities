const MAX_FAILED_COUNT = Number.parseInt(process.env.MAX_FAILED_COUNT)

module.exports = jobs => jobs.filter(job => {
    if (job && typeof job === 'object') {
        const max = (MAX_FAILED_COUNT || Number.parseInt(job.opts.attempts) || 100)
        return job.attemptsMade < max
    }
    return false
})

