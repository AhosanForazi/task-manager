// src/models/taskModel.js
// Data layer for `tasks`. All SQL lives here. Returns plain objects.

const db = require('../db/knex');

const TABLE = 'tasks';

function findAll() {
  return db(TABLE).select('*').orderBy('id', 'asc');
}

function findById(id) {
  return db(TABLE).where({ id }).first();
}

function create({ title, description = null, status = 'pending' }) {
  return db(TABLE)
    .insert({ title, description, status })
    .returning('*')
    .then((rows) => rows[0]);
}

function update(id, fields) {
  // Only allow whitelisted columns to be updated.
  const allowed = ['title', 'description', 'status'];
  const patch = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) patch[key] = fields[key];
  }
  patch.updated_at = db.fn.now();

  return db(TABLE)
    .where({ id })
    .update(patch)
    .returning('*')
    .then((rows) => rows[0]);
}

function remove(id) {
  return db(TABLE).where({ id }).del();
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
