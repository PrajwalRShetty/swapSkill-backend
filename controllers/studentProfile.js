const User=require("../db/models/userSchema");
const Student=require("../db/models/studentSchema");
const ProjectSponsor=require('../db/models/projectSponsorSchema.js')
const ConnectionRequest=require('../db/models/connectionRequestSchema.js');
const { connection } = require("mongoose");


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
          profile.connectionCount=data.connectionCount||profile.connectionCount;
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

  const checkConnection = async (userId1, userId2) => {
    const student = await Student.findOne({ userId: userId1 });
    return student.connections.includes(userId2);
  };

  const checkProfileAccess = async (req, res) => {
    try {
      const { studentId } = req.params;
      const currentUserId = req.user._id;
      const userRole = req.user.role;
  
      if (userRole === 'projectSponsor') {
        // Check if student is connected or enrolled in sponsor's project
        const isConnected = await checkConnection(currentUserId, studentId);
        const isEnrolled = await checkStudentEnrollment(studentId, currentUserId);
        
        return res.json({ 
          canAccess: isConnected || isEnrolled
        });
      }
  
      // For other roles, check only connection status
      const isConnected = await checkConnection(currentUserId, studentId);
      return res.json({ 
        canAccess: isConnected 
      });
  
    } catch (error) {
      console.error('Error checking profile access:', error);
      res.status(500).json({ error: 'Error checking profile access' });
    }
  };
  
  const checkStudentEnrollment = async (studentId, sponsorId) => {
    const enrollment = await ProjectEnrollment.findOne({
      studentId,
      'project.sponsorId': sponsorId,
      status: 'enrolled'
    });
    return !!enrollment;
  };


  const searchStudents = async (req, res) => {
    try {
      const { name, skills } = req.query;
      const currentUserId = req.user._id;
      const userRole = req.user.role; 

      const searchQuery = {
        userId: { $ne: currentUserId } 
      };
  
      // Handle name search
      if (name) {
        const user = await User.findOne({ 
          name: { $regex: name, $options: 'i' } 
        });
        
        if (!user) {
          return res.status(200).json([]); 
        }
        searchQuery['userId'] = user._id;
      }
  
      // Handle skills search
      if (skills) {
        let skillList = [];
        try {
          skillList = JSON.parse(skills);
          if (!Array.isArray(skillList)) {
            return res.status(400).json({ error: 'Skills must be an array' });
          }
  
          // Clean and escape skill strings
          skillList = skillList.map(skill => 
            skill.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          );
  
          searchQuery['skills.skillName'] = { 
            $in: skillList.map(skill => new RegExp(`^${skill}$`, 'i')) 
          };
        } catch (error) {
          return res.status(400).json({ error: 'Invalid skills format' });
        }
      }
  
      // Fetch base student results
      const students = await Student.find(searchQuery)
        .populate('userId', 'name')
        .select('_id userId profileLogo headline location skills')
        .limit(10);
  
      // For project sponsors, return basic student info
      if (userRole === 'projectSponsor') {
        const formattedStudents = students.map(student => ({
          ...student.toObject(),
          skills: student.skills.map(skill => ({
            skillName: skill.skillName
          }))
        }));
        return res.status(200).json(formattedStudents);
      }
  
      // For students, add connection status
      const currentStudent = await Student.findOne({ userId: currentUserId });
      if (!currentStudent) {
        return res.status(404).json({ error: 'Current student not found' });
      }
  
      // Add connection status for each student
      const studentsWithStatus = await Promise.all(students.map(async (student) => {
        // Check if already connected
        const isConnected = currentStudent.connections.includes(student.userId._id);
  
        // Check for pending requests
        const pendingRequest = await ConnectionRequest.findOne({
          $or: [
            { senderId: currentUserId, receiverId: student.userId._id },
            { senderId: student.userId._id, receiverId: currentUserId }
          ],
          status: 'pending'
        });
  
        // Format student object with connection status
        return {
          ...student.toObject(),
          skills: student.skills.map(skill => ({
            skillName: skill.skillName
          })),
          connectionStatus: isConnected ? 'connected' : (pendingRequest ? 'pending' : 'none')
        };
      }));
  
      res.status(200).json(studentsWithStatus);
  
    } catch (error) {
      console.error('Error in searchStudents:', error);
      res.status(500).json({ 
        error: 'Internal server error while searching students',
        message: error.message 
      });
    }
  };

  const getStudentProfile = async (req, res) => {
    try {
      const { studentId } = req.params; 
      const currentUserId = req.user._id;
      const userRole = req.user.role; 
  
      const targetStudent = await Student.findOne({ userId: studentId })
        .populate('userId', 'name email');
      
      if (!targetStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const profileResponse = {
        _id: targetStudent._id,
        userId: targetStudent.userId._id,
        name: targetStudent.userId.name,
        profileLogo: targetStudent.profileLogo,
        headline: targetStudent.headline,
        location: targetStudent.location,
        connectionCount: targetStudent.connectionCount,
        // Include all skill information
        skills: targetStudent.skills.map(skill => ({
          skillName: skill.skillName,
          learningPath: skill.learningPath,
          resources: skill.resources
        }))
      };

  
      // If user is a project sponsor, provide full access
      if (userRole === 'projectSponsor') {
        profileResponse.education = targetStudent.education;
        profileResponse.projects = targetStudent.projects;
        profileResponse.interests = targetStudent.interests;
        profileResponse.contactInfo = {
          email: targetStudent.userId.email,
          phoneNo: targetStudent.contactInfo.phoneNo,
          portfolio_link: targetStudent.contactInfo.portfolio_link
        };
        profileResponse.connectionStatus = 'sponsor';
        profileResponse.isConnected = true;
      } 
      // If user is a student, check connection status
      else if (userRole === 'student') {
        // Find the current student to check connection status
        const currentStudent = await Student.findOne({ userId: currentUserId });
        if (!currentStudent) {
          return res.status(404).json({ error: 'Current student not found' });
        }
  
        // Check if they are connected
        const isConnected = currentStudent.connections.includes(studentId);
  
        // Check if there's a pending connection request
        const pendingRequest = await ConnectionRequest.findOne({
          $or: [
            { senderId: currentUserId, receiverId: studentId },
            { senderId: studentId, receiverId: currentUserId }
          ],
          status: 'pending'
        });
  
        // Determine connection status
        let connectionStatus = 'none';
        if (isConnected) {
          connectionStatus = 'connected';
        } else if (pendingRequest) {
          connectionStatus = 'pending';
        }
  
        profileResponse.connectionStatus = connectionStatus;
        profileResponse.isConnected = isConnected;
  
        // If connected, add additional information
        if (isConnected) {
          profileResponse.education = targetStudent.education;
          profileResponse.projects = targetStudent.projects;
          profileResponse.interests = targetStudent.interests;
          profileResponse.contactInfo = {
            email: targetStudent.userId.email,
            phoneNo: targetStudent.contactInfo.phoneNo,
            portfolio_link: targetStudent.contactInfo.portfolio_link
          };
        }
      }
  
      res.status(200).json(profileResponse);
  
    } catch (error) {
      console.error('Error fetching student profile:', error);
      res.status(500).json({ error: 'Error fetching student profile' });
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
      connectionCount:profile.connectionCount,
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

// In your student controller
const getStudentProjects = async (req, res) => {
  try {
    const studentId = req.user._id; // Authenticated student's ID
    
    // Find the student
    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get applied projects
    const appliedProjects = await ProjectSponsor.find({
      'projects._id': { $in: student.appliedProjects.map(ap => ap.projectId) }
    }, {
      'projects.$': 1,
      userId: 1
    }).populate('userId', 'name');

    // Get selected projects
    const selectedProjects = await ProjectSponsor.find({
      'projects.selectedStudents': student._id
    }, {
      'projects.$': 1,
      userId: 1
    }).populate('userId', 'name');

    // Format the response
    const formattedAppliedProjects = student.appliedProjects.map(application => {
      const projectSponsor = appliedProjects.find(ps => 
        ps.projects.some(p => p._id.toString() === application.projectId.toString())
      );
      const project = projectSponsor?.projects[0];
      
      return {
        projectId: application.projectId,
        status: application.status,
        appliedDate: application.appliedDate,
        title: project?.title,
        description: project?.description,
        sponsorName: projectSponsor?.userId?.name,
        skillsRequired: project?.skillsRequired,
        applicationDeadline: project?.applicationDeadline
      };
    });

    const formattedSelectedProjects = selectedProjects.map(ps => ({
      projectId: ps.projects[0]._id,
      title: ps.projects[0].title,
      description: ps.projects[0].description,
      sponsorName: ps.userId.name,
      skillsRequired: ps.projects[0].skillsRequired,
      startDate: ps.projects[0].startDate,
      endDate: ps.projects[0].endDate,
      status: ps.projects[0].status
    }));

    res.status(200).json({
      appliedProjects: formattedAppliedProjects,
      selectedProjects: formattedSelectedProjects
    });

  } catch (error) {
    console.error('Error fetching student projects:', error);
    res.status(500).json({ error: 'Error fetching projects' });
  }
};

// In your student controller

const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    // Check if request already exists
    const existingRequest = await ConnectionRequest.findOne({
      senderId,
      receiverId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'Connection request already exists or users are already connected' 
      });
    }

    // Create new connection request
    const connectionRequest = new ConnectionRequest({
      senderId,
      receiverId
    });

    await connectionRequest.save();

    res.status(200).json({ 
      message: 'Connection request sent successfully',
      request: connectionRequest 
    });

  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ error: 'Error sending connection request' });
  }
};

const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get pending requests received by the user
    const receivedRequests = await ConnectionRequest.find({
      receiverId: userId,
      status: 'pending'
    }).populate('senderId', 'name');

    // Get pending requests sent by the user
    const sentRequests = await ConnectionRequest.find({
      senderId: userId,
      status: 'pending'
    }).populate('receiverId', 'name');

    res.status(200).json({
      received: receivedRequests,
      sent: sentRequests
    });

  } catch (error) {
    console.error('Error fetching connection requests:', error);
    res.status(500).json({ error: 'Error fetching connection requests' });
  }
};

const handleConnectionRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const userId = req.user._id;
      
    if (requestId === userId) {
      return res.status(400).json({ error: 'You cannot connect with yourself' });
    }

    const request = await ConnectionRequest.findById(requestId);
    if (!request || request.receiverId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    if (action === 'accept') {
      // Update request status
      request.status = 'accepted';
      await request.save();

      // Fix the findOneAndUpdate syntax
      await Student.findOneAndUpdate(
        { userId: request.senderId },  // Query condition
        { 
          $addToSet: { connections: request.receiverId },
          $inc: { connectionCount: 1 }
        },
        { new: true }  // Return updated document
      );

      await Student.findOneAndUpdate(
        { userId: request.receiverId },
        { 
          $addToSet: { connections: request.senderId },
          $inc: { connectionCount: 1 }
        },
        { new: true }
      );

    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
    }

    res.status(200).json({ 
      message: `Connection request ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error handling connection request:', error);
    
    // Better error handling
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Connection already exists' 
      });
    }
    
    res.status(500).json({ error: 'Error handling connection request' });
  }
};



const getConnectedStudents = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Find the current student with their connections
    const currentStudent = await Student.findOne({ userId: currentUserId })
                                     .populate('connections');
    
    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find all connected students with their user details
    const connectedStudents = await Student.find({
      userId: { $in: currentStudent.connections }
    }).populate({
      path: 'userId',
      select: 'name email'
    });

    // Format the response to include only necessary information
    const formattedConnections = connectedStudents.map(student => ({
      _id: student._id,
      userId: student.userId._id,
      name: student.userId.name,
      profileLogo: student.profileLogo || null,
      headline: student.headline || '',
      location: student.location || '',
      skills: student.skills.map(skill => ({
        skillName: skill.skillName,
        _id: skill._id
      }))
    }));

    res.status(200).json(formattedConnections);

  } catch (error) {
    console.error('Error fetching connected students:', error);
    res.status(500).json({ 
      error: 'Error fetching connected students',
      message: error.message 
    });
  }
};

const removeConnection = async (req, res) => {
  try {
      const currentUserId = req.user._id; // ID of the current user
      const { studentId } = req.body; // ID of the student to disconnect from

      // Validate if studentId is provided
      if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
      }

      // Find current student
      const currentStudent = await Student.findOne({ userId: currentUserId });
      if (!currentStudent) {
          return res.status(404).json({ error: 'Current student not found' });
      }

      // Find target student
      const targetStudent = await Student.findOne({ userId: studentId });
      if (!targetStudent) {
          return res.status(404).json({ error: 'Target student not found' });
      }

      // Remove connection from current student's connections
      currentStudent.connections = currentStudent.connections.filter(
          connection => connection.toString() !== studentId.toString()
      );
      
      // Remove connection from target student's connections
      targetStudent.connections = targetStudent.connections.filter(
          connection => connection.toString() !== currentUserId.toString()
      );

      // Decrease connection count for both students
      currentStudent.connectionCount = (currentStudent.connectionCount || 1) - 1;
      targetStudent.connectionCount = (targetStudent.connectionCount || 1) - 1;

      // Save both updates
      await Promise.all([
          currentStudent.save(),
          targetStudent.save()
      ]);

      // Delete any existing connection requests between the users
      await ConnectionRequest.deleteOne({
          $or: [
              { senderId: currentUserId, receiverId: studentId },
              { senderId: studentId, receiverId: currentUserId }
          ]
      });

      res.status(200).json({ 
          message: 'Connection removed successfully',
          success: true 
      });

  } catch (error) {
      console.error('Error removing connection:', error);
      res.status(500).json({ 
          error: 'Error removing connection',
          message: error.message 
      });
  }
};






module.exports={updateProfile,searchStudents,getStudentProfile,addSkill,deleteSkill,updateSkill,getSkills,getUserProfile,addProject,
  deleteProject,updateProject,getAvailableProjects,sendConnectionRequest,getConnectionRequests,handleConnectionRequest,
  applyForProject,getConnectedStudents,checkProfileAccess,
  getAppliedProjects,getStudentProjects,removeConnection};
  