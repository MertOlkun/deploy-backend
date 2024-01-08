// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

router.post(`/forgot-password`, userController.forgotPassword);
router.post(`/reset-password/:resetToken`, userController.resetPassword);
router.delete("/", userController.deleteUser);

module.exports = router;
