// knexfile.js — Knex configuration for the Task Management API.
// Single-environment config that points to a local SQLite file in the project root.
const path = require('path');

const common = {
  client: 'sqlite3',
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'src', 'db', 'seeds'),
  },
};

module.exports = {
  development: {
    ...common,
    connection: {
      filename: path.join(__dirname, 'tasks.db'),
    },
  },
  production: {
    ...common,
    connection: {
      filename: path.join(__dirname, 'tasks.db'),
    },
  },
};
