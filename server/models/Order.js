const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  table: { type: String, required: true, default: '1' },
  tableNumber: { type: String, default: '1' },
  customerName: { type: String },
  customerEmail: { type: String },
  orderNumber: { type: String, required: true, unique: true },
  items: [{
    menuItemId: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String },
    toppings: [{ type: String }],
    notes: { type: String },
    subtotal: { type: Number, required: true },
    status: { type: String, enum: ['Accepted', 'Cancelled', 'Pending'], default: 'Pending' }
  }],
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  rejectionReason: { type: String },
  cancellationReason: { type: String },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
  paymentMethod: { type: String, enum: ['UPI', 'CASH', 'CARD', null], default: null },
  totalAmount: { type: Number, required: true },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
