module.exports = {
  apps: [
    {
      name: 'ccusage-archive',
      script: 'npm',
      args: 'start',
      autorestart: false,
      watch: false,
      cwd: __dirname,
      // Uncomment to override the default snapshot directory:
      // env: {
      //   CCUSAGE_ARCHIVE_DIR: '/path/to/custom/snapshots',
      // },
    },
  ],
};
