module.exports = {
  apps: [
    {
      name: "abandonclaw",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
    },
  ],
};
