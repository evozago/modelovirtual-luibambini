#!/bin/bash

# Script para iniciar o ambiente de desenvolvimento
# Roda o servidor backend e o frontend simultaneamente

echo "🚀 Iniciando ambiente de desenvolvimento..."
echo ""
echo "📦 Instalando dependências do servidor backend..."
cd server && npm install && cd ..

echo ""
echo "📦 Instalando dependências do frontend..."
npm install

echo ""
echo "✅ Dependências instaladas!"
echo ""
echo "🔧 Iniciando servidores..."
echo ""
echo "📍 Backend rodará em: http://localhost:3000"
echo "📍 Frontend rodará em: http://localhost:5173"
echo ""
echo "⚠️  Mantenha este terminal aberto!"
echo ""

# Inicia o servidor backend em background
npm run server &
BACKEND_PID=$!

# Aguarda 3 segundos para o backend iniciar
sleep 3

# Inicia o frontend
npm run dev

# Quando o frontend for encerrado (Ctrl+C), encerra o backend também
kill $BACKEND_PID
