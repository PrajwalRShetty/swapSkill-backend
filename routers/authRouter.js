const express=require('express');
const {signUp,login,logout,refreshToken}=require('../controllers/authController');
const {authenticateUser}=require('../middlewares/authenticateUser')

const router=express.Router();

router.post('/signup',signUp);
router.post('/login',login);
router.post('/logout',logout);
router.post('/refresh-token',refreshToken);

router.get("/user-info", (req, res) => {res.json({ user: req.user });});

module.exports=router;