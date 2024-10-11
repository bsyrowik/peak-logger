source consts.sh

SUBSCRIPTION_ID=

curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/${SUBSCRIPTION_ID}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}"
