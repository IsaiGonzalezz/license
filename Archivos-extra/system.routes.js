const express = require('express');
const router = express.Router();
const { checkSystemStatus, activateSystem } = require('../controllers/syncSystem');

router.get('/status', checkSystemStatus);
router.get('/license-info', getLicenseWidgetData);
router.post('/activate', activateSystem);

module.exports = router;