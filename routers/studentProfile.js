const express=require("express");
const {updateProfile,searchStudents,getStudentProfile,
  addSkill,deleteSkill,updateSkill,getSkills,getUserProfile,removeConnection,
  addProject,updateProject,deleteProject,getAppliedProjects,getConnectedStudents,
  getAvailableProjects,applyForProject,getStudentProjects,sendConnectionRequest,
  getConnectionRequests,handleConnectionRequest,checkProfileAccess}=require("../controllers/studentProfile");
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

router.get('/profile/:studentId',authenticateUser,getStudentProfile);

router.post('/skills',authenticateUser,addSkill);
router.delete("/skills", authenticateUser, deleteSkill);
router.put("/skills", authenticateUser, updateSkill);

router.post('/project',authenticateUser,addProject);
router.put('/project/:id',authenticateUser,updateProject);
router.delete('/project/:id',authenticateUser,deleteProject);

router.get('/skills', getSkills);

router.get('/profile', authenticateUser, getUserProfile);


router.get('/projects', authenticateUser, getStudentProjects);


router.get('/available-projects', authenticateUser, getAvailableProjects);

// Apply for a project
router.post('/apply-project/:projectId', authenticateUser, applyForProject);

// Get student's applied projects
router.get('/applied-projects', authenticateUser, getAppliedProjects);

// In your routes file
router.post('/send-connection-request', authenticateUser, sendConnectionRequest);
router.get('/connection-requests', authenticateUser, getConnectionRequests);
router.post('/handle-connection-request', authenticateUser, handleConnectionRequest);
router.get('/connected-students', authenticateUser, getConnectedStudents);
router.post('/remove-connection', authenticateUser, removeConnection);
router.get('/check-profile-access/:studentId', authenticateUser, checkProfileAccess);




module.exports=router;