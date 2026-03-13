#!/bin/bash
set -euo pipefail

PORT="5174"
PID_FILE="/tmp/haetae-dev-${PORT}.pid"

echo "서버 중지 중..."

if [[ -f "${PID_FILE}" ]]; then
  PID="$(cat "${PID_FILE}")"
  if kill -0 "${PID}" 2>/dev/null; then
    kill "${PID}" || true
    sleep 0.5
    if kill -0 "${PID}" 2>/dev/null; then
      kill -9 "${PID}" || true
    fi
    echo "PID ${PID} 서버를 종료했습니다."
  fi
  rm -f "${PID_FILE}"
fi

LISTEN_PIDS="$(lsof -t -nP -iTCP:${PORT} -sTCP:LISTEN || true)"
if [[ -n "${LISTEN_PIDS}" ]]; then
  echo "${LISTEN_PIDS}" | xargs kill || true
  sleep 0.5
  LISTEN_PIDS="$(lsof -t -nP -iTCP:${PORT} -sTCP:LISTEN || true)"
  if [[ -n "${LISTEN_PIDS}" ]]; then
    echo "${LISTEN_PIDS}" | xargs kill -9 || true
  fi
  echo "${PORT} 포트 리스너를 종료했습니다."
else
  echo "실행 중인 ${PORT} 포트 서버가 없습니다."
fi

read -n 1 -s -r -p "창을 닫으려면 아무 키나 누르세요..."
echo
