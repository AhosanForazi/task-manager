// src/routes/taskRoutes.js
// Maps HTTP routes + methods to controller handlers. Validation is enforced
// as middleware before the controller runs.

const express = require('express');
const router = express.Router();
const {
  validateId,
  validateCreate,
  validateUpdate,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

router.get('/', getAllTasks);
router.get('/:id', validateId, getTaskById);
router.post('/', validateCreate, createTask);
router.put('/:id', validateId, validateUpdate, updateTask);
router.delete('/:id', validateId, deleteTask);

module.exports = router;
