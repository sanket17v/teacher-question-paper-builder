const express = require('express');
const router = express.Router();
const { createPaper, getPapers, getPaperById, sharePaper, getReceivedPapers, deletePaper } = require('../controllers/paperController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createPaper).get(protect, getPapers);
router.route('/received').get(protect, getReceivedPapers);
router.route('/:id').get(protect, getPaperById).delete(protect, deletePaper);
router.route('/:id/share').post(protect, sharePaper);


module.exports = router;
