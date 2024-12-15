const cron = require('node-cron');
const ConnectionRequest = require('../db/models/connectionRequestSchema'); 
// Cron job to run at midnight every day
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily cron job to clean up connection requests');

    // Delete rejected connection requests
    await ConnectionRequest.deleteMany({ status: 'rejected' });

    // Delete accepted connection requests (after they've been processed)
    await ConnectionRequest.deleteMany({ status: 'accepted' });

    // Delete expired 'pending' connection requests (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await ConnectionRequest.deleteMany({status: 'pending',createdAt: { $lt: thirtyDaysAgo }, });

    console.log('Rejected, accepted, and expired connection requests have been deleted.');
  } catch (error) {
    console.error('Error during cron job:', error);
  }
});
