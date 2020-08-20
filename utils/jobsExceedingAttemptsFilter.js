module.exports = jobs => jobs.filter(job => !job || typeof job !== 'object' || job.attemptsMade <= job.opts.attempts)
