#!/bin/bash
# Script para iniciar o servidor local do Hugo

echo "Iniciando o servidor do Hugo em http://localhost:1313/"
echo "Pressione Ctrl+C para parar."

~/.local/bin/hugo server -D
