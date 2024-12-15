const express = require('express');
// const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter=require('./routers/authRouter');
const studentProfile=require("./routers/studentProfile");
connectionRouter=require('./routers/connectionRouter');

const app = express();

require('dotenv').config();
require('./cron/cleanConnectionRequest');

require('./db/connect');

const port = process.env.PORT || 8000;
app.use(express.json());
app.use(express.urlencoded({ extended:false })); 
// app.use(cors({ origin:process.env.PROD_URL,credentials:true }));
// app.use(cors({ origin:process.env.DEV_URL,credentials:true }));
app.use(cookieParser());

app.get('/', (req,res) => {res.status(200).send('OM NAMAH SHIVAYA')});

// example to use routers
 app.use('/v1/api', authRouter);
 app.use('/v1/api',studentProfile);
 app.use('/v1/api/connection',connectionRouter);


app.listen(port,() => console.log(`server is running at port:${port}`));

