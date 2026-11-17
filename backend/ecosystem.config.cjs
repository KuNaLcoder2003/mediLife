// pm2 config for every backend service. Build first (./tsc-build.sh), then:
//   pm2 start ecosystem.config.cjs
// Each service runs from its own app folder, so it reads its own .env file.

const service = (name, dir, script) => ({
    name,
    cwd: `${__dirname}/apps/${dir}`,
    script,
    autorestart: true,
    restart_delay: 2000,
    max_restarts: 20,
    time: true,
});

module.exports = {
    apps: [
        service("primary-backend", "primary-backend", "dist/index.js"),
        service("outbox-worker", "outbox-worker", "dist/index.js"),
        service("order-worker", "order-service", "dist/index.js"),
        service("order-subscriber", "order-service", "dist/subscriber/subscriber.js"),
        service("inventory-service", "inventory-service", "dist/index.js"),
        service("payment-service", "payment-service", "dist/index.js"),
        service("webhook-handlers", "webhook-handlers", "dist/index.js"),
        service("websocket-server", "websocket-server", "dist/index.js"),
        service("mail-service", "mail-service", "dist/index.js"),
    ],
};
