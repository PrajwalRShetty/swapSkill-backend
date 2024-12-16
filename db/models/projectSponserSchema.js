const mongoose = require('mongoose');

const projectSponsorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  bio: {
    type: String,
  },
  profileLogo: {
    type: String,  
    required: false
  },
  location:{
    type:String,
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
    },
    phoneNo: {      
      type: String,
      required: false
    },
  },
  projects: [
    {
      title: {
        type: String,
      },
      description: {
        type: String,
      },
      skillsRequired: {
        type: [String], 
        required: false
      },
      budget: {
        type: Number,
        required: false
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      applicationDeadline: {
        type: Date,
      },
      enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'  
      }],
      selectedStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'  
      }],
      status: {
        type: String,
        enum: ['pending', 'complete', 'incomplete'],
        default: 'pending'
      },
    }
  ],
},{timestamps:true});

module.exports = mongoose.model('ProjectSponsor', projectSponsorSchema);
