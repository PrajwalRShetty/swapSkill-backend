const express=require("express");
const {updateProfile,searchStudents,getStudentProfile,addSkill,getSkills,getUserProfile,addProject}=require("../controllers/studentProfile");
const {authenticateUser}=require("../middlewares/authenticateUser");

const router=express.Router();

router.put('/update-profile',authenticateUser,updateProfile);

router.get('/search',authenticateUser,searchStudents);

router.get('/:studentId/studentprofile',authenticateUser,getStudentProfile);

router.post('/add-skill',authenticateUser,addSkill);

router.post('/add-project',authenticateUser,addProject);

router.get('/skills', getSkills);

router.get('/profile', authenticateUser, getUserProfile);

module.exports=router;