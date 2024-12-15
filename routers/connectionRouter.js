const express=require('express');
const {sendConnectionRequest,acceptConnectionRequest,rejectConnectionRequest,getPendingRequests,getConnections}=require('../controllers/connectionController');
const {authenticateUser}=require('../middlewares/authenticateUser');

const router=express.Router();

router.post('/request', authenticateUser, sendConnectionRequest);

router.put('/accept', authenticateUser, acceptConnectionRequest);

router.put('/reject', authenticateUser, rejectConnectionRequest);

router.get('/pending', authenticateUser, getPendingRequests);

router.get('/', authenticateUser, getConnections);

module.exports=router;
