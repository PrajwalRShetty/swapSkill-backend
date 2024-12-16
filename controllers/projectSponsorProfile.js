const User=require("../db/models/userSchema");
const ProjectSponsor=require("../db/models/projectSponserSchema");

const updateProfile = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id;
      const { section, data } = req.body;
  
      const user = await User.findById(authenticatedUserId);  
      const profile = await ProjectSponsor.findOne({ userId: authenticatedUserId });
  
      if (!user||!profile) {
        return res.status(404).send('Profile not found');
      }
  
      // Handle updates based on the section
      switch (section) {
        case 'basic-info':
          user.name = data.name || user.name;
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
          profile.profileLogo = data.profileLogo || profile.profileLogo;
          break;
  
        case 'contact-info':
          profile.contactInfo.email = data.email || profile.contactInfo.email;
          profile.contactInfo.phoneNo = data.phoneNo || profile.contactInfo.phoneNo;
          break;
  
        default:
          return res.status(400).send('Invalid section specified');
      }
  
      await profile.save();
      return res.status(200).send({ profile });
  
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


  
  module.exports = { updateProfile,addProject,enrollStudent,selectStudents};
  