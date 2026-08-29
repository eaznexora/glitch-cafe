const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const Order = require('../models/Order');
const Customer = require('../models/Customer');

async function cleanData() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error('No MongoDB URI found in environment variables.');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for clean-up...');

    // 1. Delete all test orders
    const deletedOrders = await Order.deleteMany({});
    console.log(`Deleted ${deletedOrders.deletedCount} dummy orders.`);

    // 2. Delete all customer sessions
    if (Customer) {
      const deletedCustomers = await Customer.deleteMany({});
      console.log(`Deleted ${deletedCustomers.deletedCount} dummy customers/sessions.`);
    }

    // 3. Reset counters if present
    try {
      const db = mongoose.connection.db;
      const counters = db.collection('counters');
      if (counters) {
        await counters.deleteMany({});
        console.log('Order counters reset to 1.');
      }
    } catch (e) {
      console.log('No counters collection found or unable to reset.');
    }

    console.log('✅ Menu and categories preserved. Dummy transaction data wiped cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning dummy data:', err);
    process.exit(1);
  }
}

cleanData();
