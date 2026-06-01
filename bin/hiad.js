#!/usr/bin/env node

const { Command } = require('commander');
const packageJson = require('../package.json');

const initCommand = require('../src/commands/init');
const uiCommand = require('../src/commands/ui');
const orchestrateCommand = require('../src/commands/orchestrate');

const program = new Command();

program
  .name('hiad')
  .description('High-Integrity Atomic Development (Agentic Engineering) CLI')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize the HIAD framework in the current project (creates DB and folder structure)')
  .action(initCommand);

program
  .command('ui')
  .description('Launch the local Ticket Manager UI')
  .option('-p, --port <number>', 'Port to run the UI on', '3000')
  .action(uiCommand);

program
  .command('orchestrate')
  .description('Start the sandbox orchestrator daemon for local code agents')
  .action(orchestrateCommand);

program.parse(process.argv);
