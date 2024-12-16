const express=require("express");
const {updateProfile,addProject,enrollStudent,selectStudents}=require("../controllers/projectSponsorProfile");
const {authenticateUser}=require("../middlewares/authenticateUser");

const router=express.Router();

router.put('/update-profile',authenticateUser,updateProfile);

router.post("/add-new",authenticateUser, addProject);

router.post('/:projectId/enroll', authenticateUser, enrollStudent);

router.post("/:projectId/select-students", authenticateUser, selectStudents);

module.exports=router;