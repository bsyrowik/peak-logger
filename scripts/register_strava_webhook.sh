source consts.sh

curl -X POST https://www.strava.com/api/v3/push_subscriptions \
      -F client_id=$CLIENT_ID \
      -F client_secret=$CLIENT_SECRET \
      -F callback_url=$CALLBACK_URL \
      -F verify_token=$VERIFY_TOKEN
