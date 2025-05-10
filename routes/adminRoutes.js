const express = require('express');
const {
  login,
  listMarketerRequests,
  updateMarketerVerification
} = require('../controller/adminController');
const protect = require('../middleware/auth');   // ← your middleware

const router = express.Router();

// Admin login (no auth)
router.post('/login', login);

// List pending marketer requests (protected)
router.get(
  '/marketer-requests',
  protect,                                // ← use it directly
  listMarketerRequests
);

// Approve/reject marketer (protected)
router.post(
  '/marketer-requests/:marketerId/verify',
  protect,                                // ← again, no parentheses
  updateMarketerVerification
);

module.exports = router;
