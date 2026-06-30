const path = require('path');

const common = {
  client: 'pg',
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
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'tasks',
    },
  },

  production: {
    ...common,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    },
  },
};