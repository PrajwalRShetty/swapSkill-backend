const jwt=require("jsonwebtoken");
require('dotenv').config();

const authenticateUser= async (req,res,next) =>{
    const {accessToken} =req.cookies;

    if (!accessToken) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }

    try {
        const decoded=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET);
        req.user=decoded;
        next();

    } catch (error) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }
    
};

module.exports={authenticateUser};