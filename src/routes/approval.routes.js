const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth');
const { devAuthBypass } = require('../middleware/devAuth');
const config = require('../config');

router.use(config.nodeEnv === 'development' ? devAuthBypass : authenticate);

router.get('/meta/reviewers', approvalController.getReviewers);
router.get('/', approvalController.getAll);
router.post('/', approvalController.create);
router.get('/:id', approvalController.getById);
router.patch('/:id/approve', approvalController.approve);
router.patch('/:id/reject', approvalController.reject);
router.patch('/:id/assign', approvalController.assign);
router.patch('/:id/request-revision', approvalController.requestRevision);
router.post('/:id/comments', approvalController.addComment);

module.exports = router;
