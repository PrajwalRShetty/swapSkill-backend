const ConnectionRequest=require("../db/models/connectionRequestSchema");
const Student=require("../db/models/studentSchema");

//sendConnectionRequest controller
const sendConnectionRequest = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id; 
      const { connectionUserId } = req.body; 
  
      if (authenticatedUserId === connectionUserId) {
        return res.status(400).send('You cannot connect with yourself');
      }
  
      const existingRequest = await ConnectionRequest.findOne({
        senderId: authenticatedUserId,
        receiverId: connectionUserId,
      });
      
      if (existingRequest) {
        return res.status(400).send('Connection request already sent');
      }
  
      const newRequest = new ConnectionRequest({
        senderId: authenticatedUserId,
        receiverId: connectionUserId,
      });
  
      await newRequest.save();
      res.status(200).send('Connection request sent');
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Error sending connection request');
    }
  };

  //acceptConnectionRequest Controller
  const acceptConnectionRequest = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id; 
      const { senderUserId } = req.body; 
  
      const request = await ConnectionRequest.findOne({
        senderId: senderUserId,
        receiverId: authenticatedUserId,
        status: 'pending',
      });
  
      if (!request) return res.status(404).send('Connection request not found or already accepted');
  
      request.status = 'accepted';
      await request.save();
  
      const senderProfile = await Student.findOne({ userId: senderUserId });
      const receiverProfile = await Student.findOne({ userId: authenticatedUserId });
  
      if (!senderProfile || !receiverProfile) return res.status(404).send('Profile not found');
  
      receiverProfile.connections.push(senderUserId);
      senderProfile.connections.push(authenticatedUserId);

      receiverProfile.connectionCount += 1;
      senderProfile.connectionCount += 1;
  
      await senderProfile.save();
      await receiverProfile.save();
  
      res.status(200).send('Connection established');
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Error accepting connection request');
    }
  };

  //rejectConnectionRequest Controller

  const rejectConnectionRequest = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id;
      const { senderUserId } = req.body;
  
      const request = await ConnectionRequest.findOne({
        senderId: senderUserId,
        receiverId: authenticatedUserId,
        status: 'pending',
      });
  
      if (!request) return res.status(404).send('Connection request not found');
  
      request.status = 'rejected';
      await request.save();
  
      res.status(200).send('Connection request rejected');
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Error rejecting connection request');
    }
  };

  // Get pending connection requests for the authenticated user
  const getPendingRequests = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id;
  
      const pendingRequests = await ConnectionRequest.find({
        receiverId: authenticatedUserId,
        status: 'pending',
      }).populate('senderId', 'name'); 
      res.status(200).send(pendingRequests);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching pending requests');
    }
  };
  
  // Get all connections of the authenticated user
  const getConnections = async (req, res) => {
    try {
      const authenticatedUserId = req.user._id;
  
      const profile = await Student.findOne({ userId: authenticatedUserId }).populate(
        'connections',
        'name headline'
      );
  
      if (!profile) return res.status(404).send('Profile not found');
  
      res.status(200).send(profile.connections);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching connections');
    }
  };
  
  

  module.exports={sendConnectionRequest,acceptConnectionRequest,rejectConnectionRequest,getPendingRequests,getConnections};
  
  
  