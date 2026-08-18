const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  orderNumber: { type: String, required: true, unique: true },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String }
  }],
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'COMPLETED', 'REJECTED'],
    default: 'PENDING'
  },
  rejectionReason: { type: String },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
  paymentMethod: { type: String, enum: ['UPI', 'CASH', 'CARD', null], default: null },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
