# Kiko glossary guide

This is a simple boilerplate for a Kiko subbot application.


## Send a test request to the local server

```shell
# start app
node ./src/index.js

# new terminal
# enter your own subdomain
ngrok http 8082 -subdomain=e9be2d936286 

# new terminal
export HOST=https://e9be2d936286.ngrok.io

curl -0 -X POST "${HOST}/v1/webhook-message-sent?referer=//xyz.de/api" \
-H "Expect:" \
-H 'Content-Type: application/json; charset=utf-8' \
-d @message-webhook-test-request.json
```