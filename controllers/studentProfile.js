const User=require("../db/models/userSchema");
const Student=require("../db/models/studentSchema");

//updateProfile Controller
const updateProfile = async (req, res) => {

    try {
      const authenticatedUserId = req.user._id; 
      const { section, data } = req.body;
  
      const user = await User.findById(authenticatedUserId);  
      const profile = await Student.findOne({ userId: authenticatedUserId });
  
      if (!user || !profile) {
         return res.status(404).send('User or Profile not found');
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
          profile.backgroundImage = data.backgroundImage || profile.backgroundImage;
          break;
  
        case 'logo':
          profile.profileLogo = data.logo || profile.profileLogo;
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
  
      return res.status(200).send({ profile });
  
    } catch (error) {
      console.error(error);
      return res.status(500).send('Error updating profile');
    }
  };


  //searchStudent controller
  const searchStudents = async (req, res) => {
    const { name, skills } = req.query;
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
  console.log(studentId);
  


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
  

  module.exports={updateProfile,searchStudents,getStudentProfile};
  