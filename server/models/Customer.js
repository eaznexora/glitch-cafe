const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  lastVisit: { type: Date, default: Date.now },
  totalVisits: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
