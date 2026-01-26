#!/bin/bash
# 抓取服务器专用部署脚本（无需 build 和 pm2）
set -e

cd ~/buzzing-agent

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
source ~/.nvm/nvm.sh
nvm use 22
npm install

echo "✅ Fetch server updated!"
