#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/bagtaejun/Documents/haetae/new"
PORT="5174"
PID_FILE="/tmp/haetae-dev-${PORT}.pid"
LOG_FILE="/tmp/haetae-dev-${PORT}.log"

echo "서버 시작 중..."

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "이미 ${PORT} 포트에서 서버가 실행 중입니다."
  echo "로컬: http://localhost:${PORT}/"
  echo "모바일: http://$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1):${PORT}/"
  read -n 1 -s -r -p "창을 닫으려면 아무 키나 누르세요..."
  echo
  exit 0
fi

cd "${PROJECT_DIR}"
nohup npm run dev --workspace app -- --host 0.0.0.0 --port "${PORT}" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" >"${PID_FILE}"

sleep 1
if kill -0 "${SERVER_PID}" 2>/dev/null; then
  echo "서버가 실행되었습니다. (PID: ${SERVER_PID})"
  echo "로컬: http://localhost:${PORT}/"
  echo "모바일: http://$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1):${PORT}/"
  echo "로그: ${LOG_FILE}"
else
  echo "서버 시작에 실패했습니다. 로그를 확인해주세요:"
  tail -n 60 "${LOG_FILE}" || true
fi

read -n 1 -s -r -p "창을 닫으려면 아무 키나 누르세요..."
echo
