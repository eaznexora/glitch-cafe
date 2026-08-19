require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const customerAuthRoutes = require('./routes/customerAuth');
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api', apiRoutes);

// Standard JSON error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5005;

// Start Server Independently
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// Connect to Database
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    
    // Seed Master Admin
    const Admin = require('./models/Admin');
    const bcrypt = require('bcryptjs');
    const masterEmail = 'glitchcafe.eaz@gmail.com';
    const masterExists = await Admin.findOne({ email: masterEmail });
    if (!masterExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('glitchcafe.eaz@#', salt);
      await Admin.create({
        email: masterEmail,
        password: hashedPassword,
        isSuperAdmin: true,
        permissions: ['dashboard', 'orders', 'tables', 'menu', 'inventory', 'analytics', 'billing', 'settings']
      });
      console.log('✅ Master Admin Seeded Successfully!');
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));
