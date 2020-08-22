module.exports = jobs => jobs.filter(job => job && typeof job === 'object' && job.attemptsMade > (parseInt(process.env.MAX_FAILED_COUNT) || job.opts.attempts))
