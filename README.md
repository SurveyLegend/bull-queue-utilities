Scripts to clean completed jobs from queues and to retry failed jobs.

# Environment variables

Copy example .env file in repository root folder.

```bash
cp .env.example .env
```

specify Redis connection details and optionally slack details in case you want to receive notifications from scripts.

# Clean completed jobs

This script comes in handy when there are thousands of completed jobs in the queues. 
It becomes cumbersome to delete 1000 at a time manually through a UI like https://github.com/bee-queue/arena.

```bash
node clean_completed_jobs.js queue1 queue2
```

# Retry failed jobs

This script can be run periodically using CRON or a process manager like https://github.com/unitech/pm2,
to automatically retry failed jobs in queues.
It can also post a message to Slack when failed jobs are detected and retried. 

```bash
node retry_failed_jobs.js queue1 queue2
```

# PM2

Copy example ecosystem file

```bash
cp ecosystem.config.example.js ecosystem.config.js
```

and modify with custom values, 
add your own queue names in the args properties for each app/script and set your own CRON schedule.

Start scripts using pm2.

```bash
pm2 start ecosystem.config.js
```
