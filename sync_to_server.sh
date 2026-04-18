#!/usr/bin/env bash
# 兼容旧入口：仅同步代码，不执行远端部署。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

exec ./deploy.sh --sync-only
