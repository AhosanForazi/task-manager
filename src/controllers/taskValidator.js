// src/controllers/taskValidator.js
// Joi schemas for task input. Schemas are intentionally permissive on PATCH
// (fields optional) and strict on POST (title required, status enumerated).

const Joi = require('joi');

const STATUS_VALUES = ['pending', 'in_progress', 'done'];

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().allow('', null).max(2000).default(null),
  status: Joi.string()
    .valid(...STATUS_VALUES)
    .default('pending'),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255),
  description: Joi.string().allow('', null).max(2000),
  status: Joi.string().valid(...STATUS_VALUES),
}).min(1); // at least one field must be present

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  STATUS_VALUES,
  createTaskSchema,
  updateTaskSchema,
  idParamSchema,
};
