const express=require("express");
const {updateProfile,searchStudents,getStudentProfile,addSkill}=require("../controllers/studentProfile");
const {authenticateUser}=require("../middlewares/authenticateUser");

const router=express.Router();

router.put('/update-profile',authenticateUser,updateProfile);

router.get('/search',authenticateUser,searchStudents);

router.get('/:studentId/profile',authenticateUser,getStudentProfile);

router.post('/skill',authenticateUser,addSkill);

module.exports=router;