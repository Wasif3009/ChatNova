const express = require("express");
const router = express.Router();
const {
  summarizeChat,
  analyzeSentiment,
} = require("../controllers/aiController");

router.post("/summarize", summarizeChat);
router.post("/sentiment", analyzeSentiment);

module.exports = router;
