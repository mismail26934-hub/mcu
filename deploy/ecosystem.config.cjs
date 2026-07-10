module.exports = {
  apps: [
    {
      name: "mcu-app",
      script: "server.js",
      cwd: "/var/www/mcu-app",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        MAX_UPLOAD_FILES: 50,
        MAX_UPLOAD_MB: 15,
      },
    },
  ],
};
