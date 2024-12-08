const mongoose=require("mongoose");
const bcrypt=require('bcrypt');
const {comparePassword}=require("../methods/authMethod")

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
    },
    refreshToken:{
       type:String, 
    }    
},{timestamps:true});

//A compound index to enforce unique email per role
userSchema.index({email:1,role:1},{unique:true});

//hash the password
userSchema.pre('save',async function (next) {
    if(!this.isModified('password')) return next();
    this.password=await bcrypt.hash(this.password,10);
    return next();
});

userSchema.methods.comparePassword = comparePassword;

module.exports=mongoose.model("User",userSchema);