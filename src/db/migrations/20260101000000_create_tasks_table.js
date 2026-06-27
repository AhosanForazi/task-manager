// src/db/migrations/20260101000000_create_tasks_table.js
// Initial schema: tasks table with the standard CRUD fields.

exports.up = function up(knex) {
  return knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    // pending | in_progress | done
    table
      .string('status', 32)
      .notNullable()
      .defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('tasks');
};
