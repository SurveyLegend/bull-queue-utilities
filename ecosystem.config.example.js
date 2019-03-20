const result = require('dotenv').config()

if (result.error) {
    throw result.error
}

module.exports = {
    apps: [
        {
            name: 'clean_completed_jobs',
            script: './clean_completed_jobs.js',
            autorestart: false,
            // TODO: setup your own schedule
            cron_restart: '0 0 * * *', // run once every day
            // TODO: specify your queue names here
            args: 'queue1 queue2',
            env: result.parsed
        },
        {
            name: 'retry_failed_jobs',
            script: './retry_failed_jobs.js',
            autorestart: false,
            // TODO: setup your own schedule
            cron_restart: '*/10 * * * *', // run every 10 minutes
            // TODO: specify your queue names here
            args: [
                'queue1',
                'queue2'
            ],
            env: result.parsed
        }
    ]
}
