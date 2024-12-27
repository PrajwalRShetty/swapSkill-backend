const mongoose=require("mongoose");

const studentSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        unique: true,
        required:true
    },
    profileLogo: {  
        type: String,
        required: false  
    },
    backgroundImage: {  
        type: String,
        required: false  
    },
    headline:{
        type:String,
    },
    education:{
        type:String,
    },
    location:{
        type:String,
    },
    connections:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }  
    ],
    connectionCount: { 
        type: Number, default: 0 
    },
    skills: [
        {
            skillName:{          
                type: String,
            },
            learningPath:{
                type: [String],    
            },
            resources: {
                type: [String],    
            },
        
        }
    ],
    projects:[  
        {
            title: {        
                type: String,
            },
            description: {    
                type: String,
            },
            skills_involved: {  
                type: [String],    
            },
            github_link: {    
                type: String,
            }
        }
    ],
    interests:{
        type:[String],
    },
    workedProjects: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectSponsor',  
        required: false
        }
    ],
    contactInfo: {  
        email: {
        type: String,
        required: true,
        },
        phoneNo: {      
        type: String,
        required: false
        },
        dob: {          
        type: Date,
        required:false
        },
        portfolio_link: {  
        type: String,
        }
    },
    appliedProjects: [{
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ProjectSponsor.projects'
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending'
        },
        appliedDate: {
          type: Date,
          default: Date.now
        }
      }],
},{timestamps:true});

module.exports = mongoose.model('Student', studentSchema);