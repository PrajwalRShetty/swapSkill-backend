const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:["student","projectSponsor"],
        required:true
    }
},{timestamps:true});

//A compound index to enforce unique email per role
userSchema.index({email:1,role:1},{unique:true});

module.exports=mongoose.model("User",userSchema);