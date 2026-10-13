#!/bin/bash
#
# Starts a long lived Cozy Stack + CouchDB + Mailpit + fake openRAG stack with the assistant
# installed, for manual or agent driven exploratory QA. Each start recreates it from scratch.
#
#   scripts/qa-environment/build.sh    # once, and whenever the code under test changes
#   scripts/qa-environment/start.sh
#   QA_USERS="dave erin" scripts/qa-environment/start.sh   # extra accounts
#
# Accounts (instance / password): alice.cozy.localhost / alice1234, bob.cozy.localhost / bob1234,
# charlie.cozy.localhost / charlie1234, plus QA_USERS (<uid>1234). The assistant is served on
# http://<uid>-assistant.cozy.localhost:<port>/, the scribe host (an app opening the assistant
# intent) on http://<uid>-scribe-host.cozy.localhost:<port>/.
#
# The chat is answered by fake-openrag/server.mjs: canned answers, no LLM.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

QA_PROJECT="${QA_PROJECT:-twake-assistant-qa}"
QA_USERS="${QA_USERS:-}"
# Published on 127.0.0.1 only. The stack listens on the same port inside the network.
export QA_STACK_PORT="${QA_STACK_PORT:-18920}"
export QA_MAIL_PORT="${QA_MAIL_PORT:-18921}"
ROOT_DOMAIN="cozy.localhost"
USERS="alice bob charlie $QA_USERS"
# Installed from the registry next to the assistant, so that the bar, the links to the files and
# the knowledge base folders lead somewhere. Best effort: the assistant is still tested when the
# registry is unreachable.
REGISTRY_APPS="${QA_REGISTRY_APPS:-home settings drive store}"

# Features of the assistant hidden behind a flag that work without an external service (the
# web search is answered by the fake openRAG; the mail source needs Twake Mail: left off).
# The provisioned assistants search the Projects folder of the seed, and the whole Drive.
FLAGS='{
  "cozy.assistant.enabled": true,
  "cozy.assistant.create-assistant.enabled": true,
  "cozy.assistant.search-conversation.enabled": true,
  "cozy.assistant.conversation-sharing.enabled": true,
  "cozy.assistant.websearch.enabled": true,
  "cozy.searchbar.enabled": true,
  "cozy.assistant.autoprovision": [
    {"name": "Projects", "dirName": "Projects", "default": true},
    {"name": "My Drive", "dirId": "io.cozy.files.root-dir"}
  ]
}'

compose() {
  docker compose -p "$QA_PROJECT" -f "$SCRIPT_DIR/docker-compose.yaml" "$@"
}

stack() {
  compose exec -T cozystack cozy-stack "$@"
}

if [ ! -f "$REPO_DIR/build/manifest.webapp" ]; then
  echo "The build of the assistant is missing, build it first: scripts/qa-environment/build.sh" >&2
  exit 1
fi

echo "==> Starting the stack as compose project '$QA_PROJECT'"
compose up -d --wait --wait-timeout 300

echo "==> Waiting for cozy-stack"
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$QA_STACK_PORT/version" >/dev/null; then
    ready=true
    break
  fi
  sleep 2
done
if [ "${ready:-false}" != "true" ]; then
  echo "cozy-stack did not start within 2 minutes, see: docker compose -p $QA_PROJECT logs" >&2
  exit 1
fi

echo "==> Creating the QA accounts"
for uid in $USERS; do
  domain="$uid.$ROOT_DOMAIN:$QA_STACK_PORT"
  name="${uid^}"
  stack instances add "$domain" \
    --passphrase "${uid}1234" --email "$uid@$ROOT_DOMAIN" --public-name "$name" \
    --locale en --tz Europe/Paris >/dev/null
  stack apps install assistant file:///app/assistant --domain "$domain" >/dev/null
  stack apps install scribe-host file:///app/scribe-host --domain "$domain" >/dev/null
  for app in $REGISTRY_APPS; do
    stack apps install "$app" --domain "$domain" >/dev/null \
      || echo "    warning: $app could not be installed from the registry for $uid" >&2
  done
  stack features flags --domain "$domain" "$FLAGS" >/dev/null
  stack files import --domain "$domain" --from /app/seed --to / >/dev/null
  echo "    $uid: http://$uid-assistant.$ROOT_DOMAIN:$QA_STACK_PORT/ / ${uid}1234"
done

cat <<INFO

==> The QA environment is up

  Assistant:   http://alice-assistant.$ROOT_DOMAIN:$QA_STACK_PORT/  (bob-assistant, charlie-assistant)
  Scribe host: http://alice-scribe-host.$ROOT_DOMAIN:$QA_STACK_PORT/
  Login:       http://alice.$ROOT_DOMAIN:$QA_STACK_PORT/auth/login  (alice1234, bob1234, charlie1234)
  Emails:      http://127.0.0.1:$QA_MAIL_PORT  (Mailpit)
  openRAG:     docker compose -p $QA_PROJECT logs -f openrag  (fake, canned answers)

From a container (e.g. Playwright), join the network '${QA_PROJECT}_default' and use:
  --host-resolver-rules="MAP *.$ROOT_DOMAIN cozystack"
and open Mailpit at http://mailpit:8025.

Stop it with: scripts/qa-environment/stop.sh
INFO
