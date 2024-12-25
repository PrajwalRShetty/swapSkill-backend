const User=require("../db/models/userSchema");
const Student=require("../db/models/studentSchema");
const ProjectSponsor=require('../db/models/projectSponsorSchema.js')


//updateProfile Controller
const updateProfile = async (req, res) => {

    try {
      const authenticatedUserId = req.user._id; 
      const { section, data } = req.body;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      console.log("Request body:", req.body);
      console.log("Uploaded files:", req.files);

  
      const user = await User.findById(authenticatedUserId);  
      const profile = await Student.findOne({ userId: authenticatedUserId });
  
      if (!user || !profile) {
         return res.status(404).send('User or Profile not found');
      }
      
      if (req.files) {
        if (req.files.backgroundImage) {
          profile.backgroundImage = `${baseUrl}/uploads/${req.files.backgroundImage[0].filename}`;
        }
        if (req.files.profileLogo) {
          profile.profileLogo = `${baseUrl}/uploads/${req.files.profileLogo[0].filename}`;
        }
      }
  
      // Handle updates based on the section
      switch (section) {
        case 'basic-info':
          user.name = data.name || user.name;
          profile.headline = data.headline || profile.headline;
          profile.education = data.education || profile.education;
          profile.location = data.location || profile.location;
          break;
  
        case 'skills':
            if (data.skills) {
                data.skills.forEach(skill => {
                    if (!skill.skillName ||  skill.resources.length === 0 || skill.learningPath.length === 0 ) {
                        return res.status(400).send('All fields (skillName, learningPath, and resources) are required for skills');
                    }
                });
            }
          profile.skills = data.skills || profile.skills; 
          break;
  
        case 'projects':
            if (data.projects) {
                data.projects.forEach(project => {
                  if (!project.title || !project.description || !project.skills_involved || !project.github_link) {
                    return res.status(400).send('All fields (title, description, skills_involved, and github_link) are required for projects');
                  }
                });
            }
          profile.projects = data.projects || profile.projects; 
          break;
  
        case 'background-image':
          if (req.files.backgroundImage) {
            profile.backgroundImage = `/uploads/${req.files.backgroundImage[0].filename}`;
          } else {
            profile.backgroundImage = data.backgroundImage || profile.backgroundImage;
          }
          break;
  
        case 'logo':
          if (req.files.profileLogo) {
            profile.profileLogo = `/uploads/${req.files.profileLogo[0].filename}`;
            console.log(profile.profileLogo);
          } else {
            profile.profileLogo = data.logo || profile.profileLogo;
          }
          break;
  
        case 'interests':
          profile.interests = data.interests || profile.interests;
          break;
  
        case 'contact-info':
            profile.contactInfo.phoneNo = data.phoneNo || profile.contactInfo.phoneNo;
            profile.contactInfo.dob = data.dob || profile.contactInfo.dob;
            profile.contactInfo.portfolio_link = data.portfolio_link || profile.contactInfo.portfolio_link;
          break;
  
        default:
          return res.status(400).send('Invalid section specified');
      }
  
      await user.save(); 

      await profile.save(); 
  
      return res.status(200).send({ profile,user});
  
    } catch (error) {
      console.error(error);
      return res.status(500).send('Error updating profile');
    }
  };


  //searchStudent controller
  const searchStudents = async (req, res) => {
    const { name, skills } = req.query;
    console.log('Authenticated user:', req.user);
    const authenticatedUserId = req.user._id;
  
    try {
      const searchQuery = {};

      searchQuery['userId'] = { $ne: authenticatedUserId };
  
      if (name) {
        const user = await User.findOne({ name: { $regex: name, $options: 'i' } });
        
        if (user) {
          searchQuery['userId'] = user._id;
        } else {
          return res.status(200).json([]);
        }
      }
  
      if (skills) {
        let skillList = [];
        try {
          skillList = JSON.parse(skills); 
          if (!Array.isArray(skillList)) {
            throw new Error('Invalid skills format');
          }
        } catch (error) {
          return res.status(400).json({ error: 'Invalid skills parameter' });
        }

        skillList = skillList.map(skill => skill.trim());

        const escapedSkills = skillList.map(skill => {
          return skill.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");
        });  

        searchQuery['skills.skillName'] = { $in: escapedSkills.map(skill => new RegExp(skill, 'i')) };
      }
  
  
      const students = await Student.find(searchQuery)
        .populate('userId', 'name') 
        .select('_id name profileLogo headline location skills')
        .limit(10);

        students.forEach(student => {
          student.skills = student.skills.map(skill => ({
            skillName: skill.skillName, 
          }));
        });
      res.status(200).json(students);
     
    } catch (err) {
      console.error('Error fetching students:', err);
      res.status(500).json({ error: 'Error fetching students' });
    }
  };

  // Fetch profile with connection check
  const getStudentProfile = async (req, res) => {
  const { studentId } = req.params;
  const userId = req.user._id;

  try {
    const targetStudent = await Student.findOne({userId:studentId});
    if (!targetStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isConnected = targetStudent.connections.includes(userId);

    if (isConnected) {
      res.status(200).json(targetStudent); // Return full profile
    } else {
      // Return basic info
      const basicInfo = {
        _id: targetStudent._id,
        name: targetStudent.name,
        profileLogo: targetStudent.profileLogo,
        headline: targetStudent.headline,
        location: targetStudent.location,
        connectionCount: targetStudent.connectionCount,
        skills: targetStudent.skills.map(skill => ({
          skillName: skill.skillName,
        })),
      };
      res.status(200).json(basicInfo);
    }
  } catch (err) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

//add new Skill
const addSkill = async (req, res) => {
  try {
    const studentId = req.user._id; 
    const { skillName, learningPath, resources } = req.body;
    console.log(req.body);

    // Validate required fields
    if (!skillName || !learningPath || !resources) {
      return res.status(400).send("Skill name, learning path, and resources are required");
    }

    // Find the student profile
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).send("Student profile not found");
    }
    
    const skillExists = student.skills.some(skill => skill.skillName.toLowerCase() === skillName.toLowerCase());
    if (skillExists) {
      return res.status(400).send("Skill with this name already exists");
    }

    const newSkill = {
      skillName,
      learningPath,
      resources,
    };

    student.skills.push(newSkill);
    await student.save();

    res.status(201).send({
      message: "Skill added successfully",
      skill: newSkill,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding skill");
  }
};

const deleteSkill = async (req, res) => {
  try {
    const studentId = req.user._id; 
    const { skillName } = req.body;

    // Validate required field
    if (!skillName) {
      return res.status(400).send("Skill name is required");
    }

    // Find the student profile
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).send("Student profile not found");
    }

    // Find the skill and remove it
    const skillIndex = student.skills.findIndex(skill => skill.skillName.toLowerCase() === skillName.toLowerCase());
    if (skillIndex === -1) {
      return res.status(404).send("Skill not found");
    }

    student.skills.splice(skillIndex, 1);
    await student.save();

    res.status(200).send({
      message: "Skill deleted successfully",
      deletedSkillName: skillName,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while deleting the skill");
  }
};

const updateSkill = async (req, res) => {
  try {
    const studentId = req.user._id; 
    const { skillName, updatedLearningPath, updatedResources } = req.body;
    console.log(req.body);

    // Find the student profile
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).send("Student profile not found");
    }

    // Find the skill
    const skill = student.skills.find((skill) => skill.skillName.toLowerCase() === skillName.toLowerCase());
    console.log(skill);
    
    if (!skill) {
      return res.status(404).send("Skill not found");
    }
    console.log(updatedLearningPath);
    // Update skill properties if provided
    if (updatedLearningPath) {
      skill.learningPath = updatedLearningPath; 
    }
    if (updatedResources) {
      skill.resources = updatedResources; 
    }

    await student.save();

    res.status(200).send({
      message: "Skill updated successfully",
      updatedSkill: skill,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while updating the skill");
  }
};


 // Get all unique skillNames from the `skills` array in Student collection
const getSkills = async (req, res) => {
  try {
    const skillNames = await Student.distinct('skills.skillName');
    res.status(200).json(skillNames);  
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching skills' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; 

    // Find the user and their associated student profile
    const user = await User.findById(userId);
    const profile = await Student.findOne({ userId });

    if (!user || !profile) {
      return res.status(404).json({ error: 'User or profile not found' });
    }

    // Construct the profile response
    const fullProfile = {
      name: user.name,
      email: user.email,
      profileLogo: profile.profileLogo,
      headline: profile.headline,
      location: profile.location,
      education: profile.education,
      skills: profile.skills,
      projects: profile.projects,
      backgroundImage: profile.backgroundImage ? `${profile.backgroundImage}?t=${Date.now()}` : null,
      interests: profile.interests,
      contactInfo: profile.contactInfo,
    };

    res.status(200).json({ profile: fullProfile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

const addProject = async (req, res) => {
  try {
    const studentId = req.user._id; 
    const { title, description, skills_involved, github_link } = req.body;

    // Validate required fields
    if (!title || !description || !github_link) {
      return res
        .status(400)
        .json({ error: "Title, description, and GitHub link are required." });
    }
    
    // Find the student's profile
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    // Create a new project object
    const newProject = {
      title,
      description,
      skills_involved,
      github_link,
    };

    // Add the project to the student's profile
    student.projects.push(newProject);
    await student.save();

    res.status(201).json({
      message: "Project added successfully",
      project: newProject,
    });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({ error: "An error occurred while adding the project." });
  }
};

const updateProject = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { _id, title, description, skills_involved, github_link } = req.body;

    if (!title || !description || !github_link) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    const projectIndex = student.projects.findIndex((proj) => proj._id.toString() === _id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found." });
    }

    student.projects[projectIndex] = { _id, title, description, skills_involved, github_link };
    await student.save();

    res.status(200).json({ message: "Project updated successfully.", updatedProject: student.projects[projectIndex] });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "An error occurred while updating the project." });
  }
};

const deleteProject = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { _id } = req.body;

    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    student.projects = student.projects.filter((proj) => proj._id.toString() !== _id);
    await student.save();

    res.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "An error occurred while deleting the project." });
  }
};


const getAvailableProjects = async (req, res) => {
  try {
   
    const projectSponsors = await ProjectSponsor.find({
      'projects.status': 'pending',
      'projects.applicationDeadline': { $gt: new Date() }
    });

    // Get all projects and flatten them into a single array
    let allProjects = [];
    projectSponsors.forEach(sponsor => {
      const activeProjects = sponsor.projects.filter(project => 
        project.status === 'pending' && 
        new Date(project.applicationDeadline) > new Date()
      );

      const projectsWithSponsorInfo = activeProjects.map(project => ({
        ...project.toObject(),
        sponsorName: sponsor.contactInfo.email,
        sponsorId: sponsor._id
      }));
      
      allProjects = [...allProjects, ...projectsWithSponsorInfo];
    });

    // Check if student has already applied to any projects
    const student = await Student.findOne({ userId: req.user._id });
    const appliedProjectIds = student.appliedProjects.map(app => app.projectId.toString());

    const projectsWithApplicationStatus = allProjects.map(project => ({
      ...project,
      hasApplied: appliedProjectIds.includes(project._id.toString())
    }));

    res.status(200).json({ projects: projectsWithApplicationStatus });
  } catch (error) {
    console.error('Error fetching available projects:', error);
    res.status(500).json({ error: 'Error fetching projects' });
  }
};

// Apply for a project
const applyForProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const studentId = req.user._id;

    // Find the student
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if already applied
    if (student.appliedProjects.some(app => app.projectId.toString() === projectId)) {
      return res.status(400).json({ error: 'Already applied to this project' });
    }

    // Find the project
    const projectSponsor = await ProjectSponsor.findOne({
      'projects._id': projectId
    });

    if (!projectSponsor) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectSponsor.projects.id(projectId);
    
    // Check if project is still accepting applications
    if (project.status !== 'pending' || new Date(project.applicationDeadline) < new Date()) {
      return res.status(400).json({ error: 'Project is no longer accepting applications' });
    }

    // Add application to student's records
    student.appliedProjects.push({
      projectId: projectId,
      status: 'pending'
    });
    await student.save();

    // Add student to project's enrolled students
    project.enrolledStudents.push(student._id);
    await projectSponsor.save();

    res.status(200).json({ 
      message: 'Successfully applied to project',
      application: {
        projectId,
        status: 'pending',
        appliedDate: new Date()
      }
    });

  } catch (error) {
    console.error('Error applying to project:', error);
    res.status(500).json({ error: 'Error applying to project' });
  }
};

// Get student's applied projects
const getAppliedProjects = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate({
        path: 'appliedProjects.projectId',
        model: 'ProjectSponsor',
        select: 'projects'
      });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const appliedProjects = student.appliedProjects.map(application => ({
      ...application.toObject(),
      projectDetails: application.projectId
    }));

    res.status(200).json({ applications: appliedProjects });
  } catch (error) {
    console.error('Error fetching applied projects:', error);
    res.status(500).json({ error: 'Error fetching applied projects' });
  }
};






  

module.exports={updateProfile,searchStudents,getStudentProfile,addSkill,deleteSkill,updateSkill,getSkills,getUserProfile,addProject,
  deleteProject,updateProject,getAvailableProjects,
  applyForProject,
  getAppliedProjects};
  