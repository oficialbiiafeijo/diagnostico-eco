#!/bin/bash
# Diagnóstico Comercial ECO — Grupo B3 Sales
# Dois cliques aqui ligam o sistema e abrem no navegador.
cd "$(dirname "$0")"
PORTA=8420
ENDERECO="http://127.0.0.1:$PORTA/admin"

if curl -s -m 2 "http://127.0.0.1:$PORTA/saude" | grep -q '"ok"'; then
  echo ""
  echo "  O Diagnóstico ECO já está ligado."
  echo "  Abrindo no navegador: $ENDERECO"
  echo ""
  open "$ENDERECO"
  sleep 2
  exit 0
fi

echo ""
echo "  Ligando o Diagnóstico Comercial ECO..."
( sleep 3; open "$ENDERECO" ) &
PORT=$PORTA HOST=127.0.0.1 python3 server.py
