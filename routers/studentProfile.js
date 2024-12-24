const express=require("express");
const {updateProfile,searchStudents,getStudentProfile,addSkill,deleteSkill,updateSkill,getSkills,getUserProfile,addProject}=require("../controllers/studentProfile");
const {authenticateUser}=require("../middlewares/authenticateUser");
const upload = require("../middlewares/multerConfig"); 

const router=express.Router();

router.put(
"/update-profile",
    upload.fields([
      { name: "backgroundImage", maxCount: 1 },
      { name: "profileLogo", maxCount: 1 },
    ]),
    authenticateUser,
    updateProfile
  );

router.get('/search',authenticateUser,searchStudents);

router.get('/:studentId/studentprofile',authenticateUser,getStudentProfile);

router.post('/skills',authenticateUser,addSkill);
router.delete("/skills", authenticateUser, deleteSkill);
router.put("/skills", authenticateUser, updateSkill);

router.post('/add-project',authenticateUser,addProject);

router.get('/skills', getSkills);

router.get('/profile', authenticateUser, getUserProfile);

module.exports=router;