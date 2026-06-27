// src/controllers/taskController.js
// Thin HTTP layer: parse, validate, hand off to the model, format response.

const taskModel = require('../models/taskModel');
const {
  createTaskSchema,
  updateTaskSchema,
  idParamSchema,
} = require('./taskValidator');

// Wraps a Joi schema as Express middleware.
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        error: 'ValidationError',
        details: error.details.map((d) => d.message),
      });
    }
    req[property] = value;
    next();
  };
}

async function getAllTasks(_req, res, next) {
  try {
    const tasks = await taskModel.findAll();
    res.json({ data: tasks, count: tasks.length });
  } catch (err) {
    next(err);
  }
}

async function getTaskById(req, res, next) {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'TaskNotFound', message: `Task ${req.params.id} not found` });
    }
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await taskModel.create(req.body);
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await taskModel.update(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ error: 'TaskNotFound', message: `Task ${req.params.id} not found` });
    }
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const deleted = await taskModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'TaskNotFound', message: `Task ${req.params.id} not found` });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validate,
  validateId: validate(idParamSchema, 'params'),
  validateCreate: validate(createTaskSchema, 'body'),
  validateUpdate: validate(updateTaskSchema, 'body'),
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
