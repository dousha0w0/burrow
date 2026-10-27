#!/usr/bin/env bash
# Stage the pinned Mole engine into src-tauri/engine so Tauri can bundle it.
# Layout matches Mole's own script install: an entrypoint with lib/ and bin/
# next to it, plus the two Go binaries the CLI shells out to.
set -euo pipefail

cd "$(dirname "$0")/.."
VENDOR="vendor/mole"
DEST="src-tauri/engine"
ARCH="${1:-$(uname -m)}"

case "$ARCH" in
    arm64) GOARCH="arm64" ;;
    x86_64|amd64) GOARCH="amd64" ;;
    *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

if [[ ! -d "$VENDOR/lib" ]]; then
    echo "vendor/mole is missing; run: git submodule update --init --recursive" >&2
    exit 1
fi
if ! command -v go > /dev/null 2>&1; then
    echo "Go toolchain is required to build Mole's status/analyze binaries" >&2
    exit 1
fi

VERSION="$(git -C "$VENDOR" describe --tags --always 2> /dev/null || echo unknown)"
ROOT="$(pwd)"

rm -rf "$DEST"
mkdir -p "$DEST/bin"

cp "$VENDOR/mo" "$VENDOR/mole" "$DEST/"
cp -R "$VENDOR/lib" "$DEST/lib"
cp "$VENDOR"/bin/*.sh "$DEST/bin/"
chmod +x "$DEST/mo" "$DEST/mole" "$DEST"/bin/*.sh

(
    cd "$VENDOR"
    CGO_ENABLED=0 GOOS=darwin GOARCH="$GOARCH" go build -ldflags="-s -w" \
        -o "$ROOT/$DEST/bin/status-go" ./cmd/status
    CGO_ENABLED=0 GOOS=darwin GOARCH="$GOARCH" go build -ldflags="-s -w" \
        -o "$ROOT/$DEST/bin/analyze-go" ./cmd/analyze
)

"$DEST/mo" --version | head -1
printf 'engine staged: %s -> %s (darwin/%s)\n' "$VERSION" "$DEST" "$GOARCH"
