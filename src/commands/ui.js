const { UIServer } = require('../ui/server');

async function runUI() {
    const server = new UIServer();
    server.start();
}

module.exports = { runUI };
