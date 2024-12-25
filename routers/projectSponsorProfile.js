const express=require("express");
const {updateProfile,addProject,getProjects,deleteProject,updateProject,enrollStudent,selectStudents,getProfile}=require("../controllers/projectSponsorProfile");
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

router.post('/:projectId/enroll', authenticateUser, enrollStudent);

router.post("/:projectId/select-students", authenticateUser, selectStudents);

module.exports=router;