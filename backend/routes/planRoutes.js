const express = require("express");
const router = express.Router();
const planController = require("../controllers/planController");

router.post("/update-investment", planController.updateInvestment);

module.exports = router;
