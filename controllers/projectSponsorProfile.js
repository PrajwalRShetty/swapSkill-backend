const User=require("../db/models/userSchema");
const ProjectSponsor=require("../db/models/projectSponserSchema");

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


// Enroll Student
const enrollStudent = async (req, res) => {
  try {
    const { projectId } = req.params;
    const studentId = req.user._id;
    const userRole = req.user.role; 

    if (userRole !== "student") {
      return res.status(403).send("Only students can enroll in projects");
    }

    const projectSponsor = await ProjectSponsor.findOne({ "projects._id": projectId });

    if (!projectSponsor) {
      return res.status(404).send("Project not found");
    }

    const project = projectSponsor.projects.id(projectId);

    const currentDate = new Date();
    if (currentDate > project.applicationDeadline) {
      return res.status(400).send("Enrollment is closed for this project");
    }

    // Check if the student is already enrolled
    if (project.enrolledStudents.includes(studentId)) {
      return res.status(400).send("Student already enrolled in this project");
    }

    // Add student to enrolledStudents
    project.enrolledStudents.push(studentId);
    await projectSponsor.save();

    res.status(200).send({ message: "Successfully enrolled in the project" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error enrolling in the project");
  }
};

//select Students for projects
const selectStudents = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { selectedStudentIds } = req.body; 
    const sponsorId = req.user._id; 

    const projectSponsor = await ProjectSponsor.findOne({ userId: sponsorId, "projects._id": projectId });

    if (!projectSponsor) {
      return res.status(404).send("Project not found or not owned by this sponsor");
    }

    const project = projectSponsor.projects.id(projectId);

    const invalidSelections = selectedStudentIds.filter(
      (id) => !project.enrolledStudents.includes(id)
    );

    if (invalidSelections.length > 0) {
      return res.status(400).send({
        message: "Some selected students are not enrolled in this project",
        invalidSelections,
      });
    }

    // Update the selectedStudents array
    project.selectedStudents = selectedStudentIds;
    await projectSponsor.save();

    res.status(200).send({ message: "Students successfully selected", project });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error selecting students");
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




  
  module.exports = { updateProfile,addProject,deleteProject,updateProject,enrollStudent,selectStudents,getProfile,getProjects};
  