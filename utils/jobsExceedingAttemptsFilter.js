const MAX_FAILED_COUNT = Number.parseInt(process.env.MAX_FAILED_COUNT)

module.exports = jobs => jobs.filter(job => job && typeof job === 'object' && job.attemptsMade > (MAX_FAILED_COUNT || Number.parseInt(job.opts.attempts) || 100))
