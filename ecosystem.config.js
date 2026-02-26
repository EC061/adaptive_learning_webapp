// PM2 ecosystem file for production deployment on EC2
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "adaptive-learning",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
