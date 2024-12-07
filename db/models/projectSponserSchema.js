const mongoose = require('mongoose');

const projectSponsorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  bio: {
    type: String,
    required: true
  },
  profileLogo: {
    type: String,  
    required: false
  },
  location:{
    type:String,
  },
  contactInfo: {
    type: String,
    required: false
  },
  projects: [
    {
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
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
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },
      applicationDeadline: {
        type: Date,
        required: true
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
