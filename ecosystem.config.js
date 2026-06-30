/**
 * PM2 Ecosystem Config
 * Startet den Orchestrator als dauerhaften Hintergrundprozess.
 *
 * Einmalig einrichten:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   ← startet automatisch nach Reboot
 *
 * Nützliche Befehle:
 *   pm2 status          → Prozess-Übersicht
 *   pm2 logs agent      → Live-Logs
 *   pm2 restart agent   → Neu starten
 *   pm2 stop agent      → Stoppen
 */

module.exports = {
  apps: [
    {
      name: "agent",
      script: "npx",
      args: "tsx src/lib/agent/orchestrator.ts",
      cwd: "/Users/oliver/Developer/Testschule",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      // Neustart bei Absturz, max 5× innerhalb 10 Minuten
      max_restarts: 5,
      min_uptime: "10s",
      restart_delay: 5000,
      // Logs
      out_file: "./logs/agent-out.log",
      error_file: "./logs/agent-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
