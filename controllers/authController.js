const jwt=require('jsonwebtoken');
const User=require('../db/models/userSchema');

require('dotenv').config();

// Accessing secrets from the environment variables
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'Strict', 
  };
  

//signUp controller
const signUp=async (req,res) => {
    try {
        const{name,email,password,role}=req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
          }

        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(409).json({message:'User already exists'});
        }

        const user=new User({name,email,password,role});
        await user.save();

        //generate tokens
        const accessToken=jwt.sign({ _id:user._id, role:user.role },ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
        const refreshToken=jwt.sign({ _id:user._id, role:user.role},REFRESH_TOKEN_SECRET,{expiresIn:'7d'});

        user.refreshToken=refreshToken;
        await user.save();

        //set cookies
        res.cookie('accessToken',accessToken,{...COOKIE_OPTIONS,maxAge:3600000});
        res.cookie('refreshToken',refreshToken, {...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000,});

        res.status(201).json({message:'User registered successfully'});

    }catch(err){
        console.error('Server error:', err.message);
        res.status(500).json({message:'server error'});
    }
    
};

//login controller

const login= async (req,res) =>{
    try {
        const { email,password,role }=req.body;

        if(!email||!password||!role){
            return res.status(400).json({message:"All credentials are required"});
        }

        const user=await User.findOne({email,role});
        if(!user){
            return res.status(401).json({message:"Invalid credentials"});
        }

        const isPasswordValid=await user.comparePassword(password);
        if(!isPasswordValid){
            return res.status(401).json({message:"Invalid credentials"});
        }

        //generate tokens
        const accessToken=jwt.sign({_id:user._id,role:user.role},ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
        const refreshToken=jwt.sign({_id:user._id,role:user.role},REFRESH_TOKEN_SECRET,{expiresIn:'7d'});

        //store refresh token
        user.refreshToken=refreshToken;
        await user.save();

        //set cookies
        res.cookie('accessToken',accessToken,{...COOKIE_OPTIONS,maxAge:3600000});
        res.cookie('refreshToken',refreshToken, {...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000,});

        res.status(200).json({message:"Login successful"});

    } catch(err){
        console.error('Server error:', err.message);
        res.status(500).json({message:"server error"})
    }
};

//logout controller
const logout= async(req,res) =>{
    const{refreshToken}=req.cookies;

    if (!refreshToken) {
        return res.status(400).json({ message: 'No refresh token provided' });
      }

    try {
        const user=await User.findOne({refreshToken});
        if(user){
            user.refreshToken=null;
            await user.save();
        }

        // Clear cookies
        res.clearCookie('accessToken', COOKIE_OPTIONS);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);

        res.status(200).json({ message: 'Logged out successfully' });

    } catch(err){
        console.error('Server error:', err.message);
        res.status(500).json({message:"server error"})
    }
};

//refresh token controller
const refreshToken = async (req, res) => {
    const { refreshToken } = req.cookies;
  
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }
  
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  
      const user = await User.findOne({ _id: decoded._id, refreshToken });
      if (!user) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }
  
      const accessToken = jwt.sign({ id: user._id, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
  
      res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
      res.status(200).json({ message: 'Token refreshed successfully' });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(403).json({ message: 'Invalid or expired refresh token'});
    }
  };
  



module.exports={signUp,login,logout,refreshToken};