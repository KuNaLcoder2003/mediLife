#!/usr/bin/env bash
# Runs `npx tsc -b` in every package and app of the backend.
# Shared packages build first, because the apps import their dist/ output.
# Usage (from anywhere):  ./backend/tsc-build.sh

cd "$(dirname "$0")" || exit 1

failed=()

for dir in packages/db packages/redis apps/*/; do
    dir="${dir%/}"
    [ -f "$dir/tsconfig.json" ] || continue
    echo "==> $dir"
    if ! (cd "$dir" && npx tsc -b); then
        failed+=("$dir")
    fi
done

echo
if [ ${#failed[@]} -eq 0 ]; then
    echo "All projects built successfully."
else
    echo "Build failed in: ${failed[*]}"
    exit 1
fi
