#!/usr/bin/env bash
# Starts, stops and checks every backend service.
# Each service runs from its own app folder, so it reads its own .env file.
# Logs go to backend/logs/<service>.log; process ids to backend/logs/pids.
#
# Usage:
#   ./services.sh start            start everything (build first if dist/ is missing)
#   ./services.sh start --build    run ./tsc-build.sh first, then start
#   ./services.sh stop             stop everything this script started
#   ./services.sh restart [--build]
#   ./services.sh status           show which services are running
#   ./services.sh logs <service>   follow one service's log (e.g. logs order-subscriber)

cd "$(dirname "$0")" || exit 1

LOGS="$PWD/logs"
PIDS="$LOGS/pids"

# name | app folder | entry file
SERVICES=(
    "primary-backend|apps/primary-backend|dist/index.js"
    "outbox-worker|apps/outbox-worker|dist/index.js"
    "order-worker|apps/order-service|dist/index.js"
    "order-subscriber|apps/order-service|dist/subscriber/subscriber.js"
    "inventory-service|apps/inventory-service|dist/index.js"
    "payment-service|apps/payment-service|dist/index.js"
    "webhook-handlers|apps/webhook-handlers|dist/index.js"
    "websocket-server|apps/websocket-server|dist/index.js"
    "mail-service|apps/mail-service|dist/index.js"
)

is_running() { [ -n "$1" ] && kill -0 "$1" 2>/dev/null; }

pid_of() { [ -f "$PIDS" ] && awk -F'|' -v n="$1" '$1 == n { print $2 }' "$PIDS"; }

build() {
    ./tsc-build.sh || { echo "Build failed, nothing started."; exit 1; }
}

start() {
    mkdir -p "$LOGS"
    touch "$PIDS"

    local need_build=0
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r _ dir file <<< "$entry"
        [ -f "$dir/$file" ] || need_build=1
    done
    if [ "$1" = "--build" ] || [ $need_build -eq 1 ]; then build; fi

    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name dir file <<< "$entry"
        if is_running "$(pid_of "$name")"; then
            echo "  $name already running (pid $(pid_of "$name"))"
            continue
        fi
        # exec makes $! the node process itself; nohup keeps it alive after you log out
        (cd "$dir" && exec nohup node "$file" >> "$LOGS/$name.log" 2>&1) &
        echo "$name|$!" >> "$PIDS.new"
        echo "  started $name"
    done

    # keep entries of services that were already running, add the new ones
    if [ -f "$PIDS.new" ]; then
        { awk -F'|' 'NR==FNR { fresh[$1]=1; next } !($1 in fresh)' "$PIDS.new" "$PIDS"; cat "$PIDS.new"; } > "$PIDS.tmp"
        mv "$PIDS.tmp" "$PIDS"
        rm -f "$PIDS.new"
    fi

    sleep 3
    status
}

stop() {
    [ -f "$PIDS" ] || { echo "Nothing to stop."; return; }
    while IFS='|' read -r name pid; do
        if is_running "$pid"; then
            kill "$pid" && echo "  stopped $name (pid $pid)"
        fi
    done < "$PIDS"
    # give them a moment, then force anything still alive
    sleep 2
    while IFS='|' read -r name pid; do
        is_running "$pid" && kill -9 "$pid" && echo "  force-stopped $name"
    done < "$PIDS"
    rm -f "$PIDS"
}

status() {
    local down=0
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name _ _ <<< "$entry"
        local pid
        pid="$(pid_of "$name")"
        if is_running "$pid"; then
            printf "  %-18s running  (pid %s)\n" "$name" "$pid"
        else
            printf "  %-18s DOWN     (see logs/%s.log)\n" "$name" "$name"
            down=1
        fi
    done
    return $down
}

case "$1" in
    start)   start "$2" ;;
    stop)    stop ;;
    restart) stop; start "$2" ;;
    status)  status ;;
    logs)    [ -n "$2" ] && tail -f "$LOGS/$2.log" || { echo "Usage: $0 logs <service>"; exit 1; } ;;
    *)       sed -n '5,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
