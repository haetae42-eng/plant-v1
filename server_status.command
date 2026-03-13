#!/bin/bash
set -euo pipefail

PORT="5174"
IP_ADDR="$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)"

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "서버 상태: 실행 중"
  echo "로컬: http://localhost:${PORT}/"
  echo "모바일: http://${IP_ADDR}:${PORT}/"
  echo
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN
else
  echo "서버 상태: 중지됨"
fi

read -n 1 -s -r -p "창을 닫으려면 아무 키나 누르세요..."
echo
