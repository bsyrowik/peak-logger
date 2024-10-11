source consts.sh

curl -G https://www.strava.com/api/v3/push_subscriptions \
    -d client_id=$CLIENT_ID \
    -d client_secret=$CLIENT_SECRET

