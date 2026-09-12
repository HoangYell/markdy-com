module.exports = {
  apps: [
    {
      name: 'markdy-harness',
      script: 'packages/renderer-dom/harness/serve.mjs',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 2000,
      exp_backoff_restart_delay: 2000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        HARNESS_PORT: '4325',
      },
    },
  ],
};
