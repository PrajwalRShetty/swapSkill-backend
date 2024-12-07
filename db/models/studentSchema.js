const mongoose=require("mongoose");

const studentSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    profileLogo: {  
        type: String,
        required: false  
    },
    headline:{
        type:String,
    },
    education:{
        type:String,
        required:true
    },
    location:{
        type:String,
    },
    connections:{
        type:Number,
        default:0,
        required:true
    },
    skills: [
        {
            skillName:{          
                type: String,
                required: true
            },
            learningPath:{
                type: [String],    
                required: true
            },
            resources: {
                type: [String],    
                required: true
            },
        
        }
    ],
    projects:[  
        {
            title: {        
                type: String,
                required: true
            },
            description: {    
                type: String,
                required: true
            },
            skills_involved: {  
                type: [String],    
                required: true
            },
            github_link: {    
                type: String,
                required: true
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
    }
},{timestamps:true});

module.exports = mongoose.model('Student', studentSchema);