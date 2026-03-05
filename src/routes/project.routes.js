const express = require('express');
const router  = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate }  = require('../middleware/auth');
const { devAuthBypass } = require('../middleware/devAuth');
const config            = require('../config');

router.use(config.nodeEnv === 'development' ? devAuthBypass : authenticate);

// Meta route must be registered before /:id to avoid collision
router.get('/meta', projectController.getMeta);

router.get('/',     projectController.getAll);
router.post('/',    projectController.create);
router.get('/:id',  projectController.getById);
router.put('/:id',  projectController.update);
router.delete('/:id', projectController.delete);

router.post('/:id/comments', projectController.addComment);

module.exports = router;
