const express = require('express');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

module.exports = function uiCommand(options) {
  const app = express();
  const port = options.port || 3000;
  const cwd = process.cwd();

  const dbPath = path.join(cwd, '.hiad', 'ticket-manager.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log(chalk.red(`No HIAD database found. Please run 'hiad init' first.`));
    process.exit(1);
  }

  // Serve static assets (we copy the HTML file contents internally or just serve it from package)
  // For the npm package, the HTML UI is bundled inside the package at root or /src
  const htmlPath = path.join(__dirname, '..', '..', 'ticket-manager-ui.html');
  
  app.get('/', (req, res) => {
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send("Ticket Manager UI HTML not found in package.");
    }
  });

  // Expose the db file for download/upload handling in the UI
  app.get('/db', (req, res) => {
    res.download(dbPath, 'ticket-manager.db');
  });

  app.listen(port, () => {
    console.log(chalk.green(`🚀 Ticket Manager UI running at http://localhost:${port}`));
    console.log(chalk.cyan(`Upload the .db file located at: ${dbPath} into the UI if requested.`));
  });
};
