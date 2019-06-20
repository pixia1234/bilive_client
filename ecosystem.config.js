module.exports = {
  apps : [{
    name: 'bilive_client',
    script: 'build/app.js',
    args: '',
    instances: 1,
    autorestart: true,
    output: './logs/out.log',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
