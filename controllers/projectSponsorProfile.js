const User=require("../db/models/userSchema");
const ProjectSponsor=require("../db/models/projectSponsorSchema");
const Student=require("../db/models/studentSchema");
const ConnectionRequest=require("../db/models/connectionRequestSchema")

const updateProfile = async (req, res) => {
  try {
    const authenticatedUserId = req.user._id;
    const { section, data } = req.body;
    console.log(req.body);
    
    const user = await User.findById(authenticatedUserId);  
    const profile = await ProjectSponsor.findOne({ userId: authenticatedUserId });

    if (!user || !profile) {
      return res.status(404).send('Profile not found');
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Handle updates based on the section
    switch (section) {
      case 'basic-info':
        user.name = data.name || user.name;
        profile.headline = data.headline || profile.headline;
        profile.bio = data.bio || profile.bio;
        profile.location = data.location || profile.location;
        break;

      case 'projects':
        if (!data.projects || !Array.isArray(data.projects)) {
          return res.status(400).send('Projects must be an array');
        }

        data.projects.forEach((project, index) => {
          if (!project.title || !project.description || !project.startDate || !project.endDate || !project.applicationDeadline) {
            return res.status(400).send(`All fields (title, description, startDate, endDate, applicationDeadline) are required for project at index ${index}`);
          }

          if (project.enrolledStudents) {
            return res.status(400).send('Enrolled students cannot be updated by the Project Sponsor');
          }

          if (project.status && !['pending', 'complete', 'incomplete'].includes(project.status)) {
              return res.status(400).send('Invalid status value for project');
          }

          if (project.selectedStudents && !Array.isArray(project.selectedStudents)) {
              return res.status(400).send('Selected students must be an array');
          }
        });

        profile.projects = data.projects.map((project) => {
          return {
            ...project,
            status: project.status || 'pending', 
            selectedStudents: project.selectedStudents || [] 
          };
        });
        break;

      case 'profile-logo':
        if (req.files && req.files.profileLogo) {
          profile.profileLogo = `${baseUrl}/uploads/${req.files.profileLogo[0].filename}`;
        } else {
          profile.profileLogo = data.profileLogo || profile.profileLogo;
        }
        break;

      case 'background-image':
        if (req.files && req.files.backgroundImage) {
          profile.backgroundImage = `${baseUrl}/uploads/${req.files.backgroundImage[0].filename}`;
        } else {
          profile.backgroundImage = data.backgroundImage || profile.backgroundImage;
        }
        break;

      case 'contact-info':
        profile.contactInfo.email = data.email || profile.contactInfo.email;
        profile.contactInfo.phoneNo = data.phoneNo || profile.contactInfo.phoneNo;
        break;

      default:
        return res.status(400).send('Invalid section specified');
    }

    await profile.save();
    await user.save();
    return res.status(200).send({ profile, user });

  } catch (error) {
    console.error(error);
    return res.status(500).send('Error updating profile');
  }
};


const addProject = async (req, res) => {
  try {
    const sponsorId = req.user._id; 
    const {
      title,
      description,
      skillsRequired,
      budget,
      startDate,
      endDate,
      applicationDeadline,
    } = req.body;

    if (!title || !description || !startDate || !endDate || !applicationDeadline) {
      return res.status(400).send("Title, description, startDate, endDate, and applicationDeadline are required");
    }

    const projectSponsor = await ProjectSponsor.findOne({ userId: sponsorId });

    if (!projectSponsor) {
      return res.status(404).send("Project sponsor not found");
    }

    const newProject = {
      title,
      description,
      skillsRequired: skillsRequired || [],
      budget: budget || null,
      startDate,
      endDate,
      applicationDeadline,
      enrolledStudents: [],
      selectedStudents: [],
      status: "pending",
    };

    projectSponsor.projects.push(newProject);
    await projectSponsor.save();

    res.status(201).send({
      message: "Project successfully added",
      project: newProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding project");
  }
};

const deleteProject = async (req, res) => {
  try {
    const sponsorId = req.user._id;
    const { projectId } = req.params; // Project ID to delete

    const projectSponsor = await ProjectSponsor.findOne({ userId: sponsorId });

    if (!projectSponsor) {
      return res.status(404).send("Project sponsor not found");
    }

    // Find the project to delete
    const projectIndex = projectSponsor.projects.findIndex(
      (project) => project._id.toString() === projectId
    );

    if (projectIndex === -1) {
      return res.status(404).send("Project not found");
    }

    // Remove the project from the projects array
    projectSponsor.projects.splice(projectIndex, 1);

    await projectSponsor.save();

    res.status(200).send({ message: "Project successfully deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting project");
  }
};

const updateProject = async (req, res) => {
  try {
    const sponsorId = req.user._id;
    const {projectId} = req.params; 
    const {
      title,
      description,
      skillsRequired,
      budget,
      startDate,
      endDate,
      applicationDeadline,
    } = req.body;

    if (!title || !description || !startDate || !endDate || !applicationDeadline) {
      return res.status(400).send("Title, description, startDate, endDate, and applicationDeadline are required");
    }

    const projectSponsor = await ProjectSponsor.findOne({ userId: sponsorId });

    if (!projectSponsor) {
      return res.status(404).send("Project sponsor not found");
    }

    // Find the project to update
    const projectIndex = projectSponsor.projects.findIndex(
      (project) => project._id.toString() === projectId
    );

    if (projectIndex === -1) {
      return res.status(404).send("Project not found");
    }

    // Update the project fields
        const updatedProject = {
      _id: projectSponsor.projects[projectIndex]._id,
      ...req.body
    };

    projectSponsor.projects[projectIndex] = updatedProject;

    await projectSponsor.save();

    res.status(200).send({
      message: "Project successfully updated",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating project");
  }
};


const getProfile = async (req, res) => {
  try {
    const sponsorId = req.user._id; 

    // Find the user and their associated project sponsor profile
    const user = await User.findById(sponsorId);
    const profile = await ProjectSponsor.findOne({ userId: sponsorId });

    if (!user || !profile) {
      return res.status(404).json({ error: 'User or profile not found' });
    }

    // Construct the profile response
    const fullProfile = {
      name: user.name,
      email: user.email,
      profileLogo: profile.profileLogo,
      bio: profile.bio,
      location: profile.location,
      projects: profile.projects,
      contactInfo: profile.contactInfo,
      backgroundImage: profile.backgroundImage ? `${profile.backgroundImage}?t=${Date.now()}` : null,
    };

    res.status(200).json({ profile: fullProfile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

// Get all projects for a sponsor
const getProjects = async (req, res) => {
  try {
    const sponsorId = req.user._id;
    const projectSponsor = await ProjectSponsor.findOne({ userId: sponsorId });

    if (!projectSponsor) {
      return res.status(404).json({ error: 'Project sponsor not found' });
    }

    res.status(200).json({ projects: projectSponsor.projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Error fetching projects' });
  }
};


const getEnrolledStudents = async (req, res) => {
  try {
    const { projectId } = req.params;
    const sponsorId = req.user._id;

    // Find the project sponsor and project
    const projectSponsor = await ProjectSponsor.findOne({
      userId: sponsorId,
      'projects._id': projectId
    });

    if (!projectSponsor) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectSponsor.projects.id(projectId);
    
    // Get enrolled students with their user information
    const enrolledStudents = await Student.find({
      _id: { $in: project.enrolledStudents }
    }).populate('userId', 'name'); // Populate user information

    const studentsData = enrolledStudents.map(student => ({
      _id: student._id,
      userId: student.userId._id,
      userName: student.userId.name, // Include user's name
      profileLogo: student.profileLogo,
      headline: student.headline,
      skills: student.skills,
      education: student.education,
      location: student.location
    }));

    res.status(200).json({
      students: studentsData,
      selectedStudents: project.selectedStudents
    });

  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ error: 'Error fetching enrolled students' });
  }
};

const selectStudent = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { studentId } = req.body;
    const sponsorId = req.user._id;

    const projectSponsor = await ProjectSponsor.findOne({
      userId: sponsorId,
      'projects._id': projectId
    });

    if (!projectSponsor) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectSponsor.projects.id(projectId);
    
  
    const studentIndex = project.selectedStudents.indexOf(studentId);
    if (studentIndex === -1) {
      project.selectedStudents.push(studentId);
    } else {
      project.selectedStudents.splice(studentIndex, 1);
    }

    await projectSponsor.save();

    res.status(200).json({
      message: 'Student selection updated successfully',
      selectedStudents: project.selectedStudents
    });

  } catch (error) {
    console.error('Error updating student selection:', error);
    res.status(500).json({ error: 'Error updating student selection' });
  }
};

const viewStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const sponsorId = req.user._id;

    // Find the student and populate user information
    const student = await Student.findOne({ userId: studentId })
      .populate('userId', 'name email');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hasEnrolledStudent = await ProjectSponsor.findOne({
      userId: sponsorId,
      'projects.enrolledStudents': student._id
    });

    // If student is enrolled in sponsor's project, return full profile
    if (hasEnrolledStudent) {
      const fullProfile = {
        _id: student._id,
        userId: student.userId._id,
        name: student.userId.name,
        email: student.userId.email,
        profileLogo: student.profileLogo,
        headline: student.headline,
        education: student.education,
        location: student.location,
        skills: student.skills,
        projects: student.projects,
        interests: student.interests,
        contactInfo: student.contactInfo
      };
      return res.status(200).json(fullProfile);
    }

    // Otherwise, return limited profile
    const limitedProfile = {
      _id: student._id,
      userId: student.userId._id,
      name: student.userId.name,
      profileLogo: student.profileLogo,
      headline: student.headline,
      location: student.location,
      skills: student.skills.map(skill => ({
        skillName: skill.skillName
      }))
    };

    res.status(200).json(limitedProfile);

  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Error fetching student profile' });
  }
};

const sponsorSearchStudents = async (req, res) => {
  try {
    const { name, skills } = req.query;
    const sponsorId = req.user._id;

    const searchQuery = {
      'userType': 'student' 
    };

    if (name) {
      const user = await User.findOne({ 
        name: { $regex: name, $options: 'i' },
        userType: 'student'
      });
      
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
      searchQuery['skills.skillName'] = { 
        $in: skillList.map(skill => new RegExp(skill, 'i')) 
      };
    }

    // Get students with connection status
    const students = await Student.find(searchQuery)
      .populate('userId', 'name')
      .select('_id userId profileLogo headline location skills');

    // Add connection status to each student
    const studentsWithStatus = await Promise.all(students.map(async (student) => {
      const connectionRequest = await ConnectionRequest.findOne({
        $or: [
          { sponsorId: sponsorId, studentId: student.userId._id },
          { studentId: student.userId._id, sponsorId: sponsorId }
        ]
      });

      return {
        ...student.toObject(),
        connectionStatus: connectionRequest ? connectionRequest.status : 'none'
      };
    }));

    res.status(200).json(studentsWithStatus);

  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ 
      error: 'Error searching students',
      message: error.message 
    });
  }
};


const getSponsorProfile = async (req, res) => {
  try {
    const { sponsorId } = req.params;

    const sponsorProfile = await ProjectSponsor.findById(sponsorId)
      .populate('userId', 'name email');

    if (!sponsorProfile) {
      console.log('Profile not found for sponsorId:', sponsorId); 
      return res.status(404).json({ error: 'Sponsor profile not found' });
    }

    const profileResponse = {
      _id: sponsorProfile._id,
      name: sponsorProfile.userId.name,
      bio: sponsorProfile.bio,
      profileLogo: sponsorProfile.profileLogo,
      location: sponsorProfile.location,
      contactInfo: sponsorProfile.contactInfo,
      createdAt: sponsorProfile.createdAt,
      updatedAt: sponsorProfile.updatedAt
    };

    res.status(200).json(profileResponse);

  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ error: 'Server error while fetching sponsor profile' });
  }
};


// Get sponsor projects
const getSponsorProjects = async (req, res) => {
  try {
    const { sponsorId } = req.params;

    // First verify if the sponsor exists
    const sponsorProfile = await ProjectSponsor.findById(sponsorId);
    if (!sponsorProfile) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    // Get projects for the sponsor
    const projects = await ProjectSponsor.findOne({ userId: sponsorId })
      .select('projects')
      .populate({
        path: 'projects',
        select: 'title description skillsRequired budget startDate endDate applicationDeadline status'
      });

    if (!projects) {
      return res.status(404).json({ error: 'No projects found' });
    }

    // Format the response
    const formattedProjects = projects.projects.map(project => ({
      _id: project._id,
      title: project.title,
      description: project.description,
      skillsRequired: project.skillsRequired,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
      applicationDeadline: project.applicationDeadline,
      status: project.status
    }));

    res.status(200).json({ projects: formattedProjects });
  } catch (error) {
    console.error('Error in getProjects:', error);
    res.status(500).json({ error: 'Server error while fetching sponsor projects' });
  }
};

  module.exports = { updateProfile,addProject,deleteProject,updateProject
    ,getProfile,getProjects,getEnrolledStudents,selectStudent,viewStudentProfile,sponsorSearchStudents,getSponsorProfile,getSponsorProjects};