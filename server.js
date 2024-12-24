const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter=require('./routers/authRouter');
const studentProfile=require("./routers/studentProfile");
const connectionRouter=require('./routers/connectionRouter');
const projectSponsorProfile=require('./routers/projectSponsorProfile');
const path = require("path");



const app = express();

require('dotenv').config();
require('./cron/cleanConnectionRequest');

require('./db/connect');

const port = process.env.PORT || 8000;
app.use(express.json());
app.use(express.urlencoded({ extended:false })); 

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use(cors({ origin:process.env.PROD_URL,credentials:true }));
app.use(cors({ origin:process.env.DEV_URL,credentials:true }));
app.use(cookieParser());

app.get('/', (req,res) => {res.status(200).send('OM NAMAH SHIVAYA')});

// example to use routers
 app.use('/v1/api/auth', authRouter);
 app.use('/v1/api/student',studentProfile);
 app.use('/v1/api/connection',connectionRouter);
 app.use('/v1/api/sponsor',projectSponsorProfile);
 app.use('/v1/api/projects',projectSponsorProfile);



app.listen(port,() => console.log(`server is running at port:${port}`));

