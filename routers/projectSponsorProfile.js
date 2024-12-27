const express=require("express");
const {updateProfile,addProject,getProjects,deleteProject,updateProject,
getProfile,getEnrolledStudents,selectStudent,viewStudentProfile,sponsorSearchStudents,
getSponsorProjects,getSponsorProfile}=require("../controllers/projectSponsorProfile");
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

router.get("/projects",authenticateUser,getProjects);
router.post("/projects",authenticateUser, addProject);
router.put("/projects/:projectId",authenticateUser, updateProject);
router.delete("/projects/:projectId",authenticateUser, deleteProject);

router.get('/profile',authenticateUser,getProfile);

router.get('/projects/:projectId/enrolled-students', authenticateUser, getEnrolledStudents);
router.post('/projects/:projectId/select-student', authenticateUser, selectStudent);
router.get('/student-profile/:studentId', authenticateUser, viewStudentProfile);

router.get('/search-students', authenticateUser, sponsorSearchStudents);

router.get('/profile/:sponsorId',authenticateUser,getSponsorProfile );
router.get('/projects/:sponsorId',authenticateUser,getSponsorProjects );





module.exports=router;