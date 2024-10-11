source consts.sh

curl -X POST $CALLBACK_URL -H 'Content-Type: application/json' \
    -d '{
        "aspect_type": "create",
        "event_time": "1560669",
        "object_id": "12556",
        "object_type": "activity",
        "owner_id": "0491",
        "subscription_id": "999"
    }'
