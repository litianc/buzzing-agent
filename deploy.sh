#!/bin/bash
set -e

cd ~/buzzing-agent

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
source ~/.nvm/nvm.sh
nvm use 22
npm install

echo "🔨 Building..."
npm run build

echo "🔄 Restarting PM2..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

pm2 save

echo "✅ Deploy complete!"
