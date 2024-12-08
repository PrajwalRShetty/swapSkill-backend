const express=require('express');
const {signUp,login,logout,refreshToken}=require('../controllers/authController');

const router=express.Router();

router.post('/signup',signUp);
router.post('/login',login);
router.post('/logout',logout);
router.post('/refresh-token',refreshToken);
module.exports=router;