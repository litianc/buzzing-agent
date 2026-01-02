module.exports = {
  apps: [{
    name: 'buzzing-agent',
    script: 'npm',
    args: 'start -- -p 4000',
    cwd: '/root/buzzing-agent',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
