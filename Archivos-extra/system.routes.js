const express = require('express');
const router = express.Router();
const { checkSystemStatus, activateSystem } = require('../controllers/syncSystem');

router.get('/status', checkSystemStatus);
router.post('/activate', activateSystem);

module.exports = router;