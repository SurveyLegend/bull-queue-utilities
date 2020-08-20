const isNonEmptyString = require('./isNonEmptyString')

function sendToSlack(slack_webhook_url, slack_channel) {
    if (isNonEmptyString(slack_webhook_url) && isNonEmptyString(slack_channel)) {
        const Slack = require('slack-notify')(slack_webhook_url)
        const slack = Slack.extend({
            channel: slack_channel,
            icon_emoji: ':computer:',
            username: 'Bull Queue Bot'
        })

        return options => {
            return new Promise((resolve, reject) => {
                slack(options, resolve)
            })
        }
    }
    return async () => true
}

module.exports = sendToSlack
