const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categorySlug: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: '' },
  isVeg: { type: Boolean, default: true },
  isSpecial: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 1 },
  isAvailable: { type: Boolean, default: true },
  sizes: [{
    name: { type: String },
    price: { type: Number }
  }],
  toppings: [{
    name: { type: String },
    price: { type: Number }
  }]
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
