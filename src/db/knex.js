// src/db/knex.js — Shared Knex instance. The rest of the app imports `db` from here.
const knex = require('knex');
const config = require('../../knexfile');

const environment = process.env.NODE_ENV || 'production';
const db = knex(config[environment]);

module.exports = db;
