const mongoose = require('mongoose');
const Table = require('./models/Table');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cafe-kds';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    // Clear existing
    await Table.deleteMany({});
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});

    // Create Tables
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      tables.push({
        tableNumber: i,
        qrToken: `table-${i}-secret`,
        capacity: i % 2 === 0 ? 4 : 2,
        status: i <= 3 ? 'occupied' : 'vacant'
      });
    }
    const createdTables = await Table.insertMany(tables);

    // Create Categories
    const categories = await Category.insertMany([
      { name: 'Beverages', slug: 'beverages' },
      { name: 'Mains', slug: 'mains' },
      { name: 'Desserts', slug: 'desserts' },
      { name: 'Starters', slug: 'starters' }
    ]);

    // Create Menu Items
    const menuItems = await MenuItem.insertMany([
      { name: 'Espresso', categoryId: categories[0]._id, price: 150, description: 'Strong black coffee' },
      { name: 'Latte', categoryId: categories[0]._id, price: 200, description: 'Milk coffee' },
      { name: 'Margherita Pizza', categoryId: categories[1]._id, price: 450, description: 'Classic cheese and tomato' },
      { name: 'Pasta Alfredo', categoryId: categories[1]._id, price: 400, description: 'Creamy white sauce pasta' },
      { name: 'Chocolate Brownie', categoryId: categories[2]._id, price: 250, description: 'Warm brownie with ice cream' },
      { name: 'Garlic Bread', categoryId: categories[3]._id, price: 180, description: 'Toasted bread with garlic butter' }
    ]);

    // Create mock orders
    const orders = await Order.insertMany([
      {
        tableId: createdTables[0]._id,
        orderNumber: 'ORD-001',
        items: [
          { menuItemId: menuItems[0]._id, name: menuItems[0].name, price: menuItems[0].price, quantity: 2 },
          { menuItemId: menuItems[5]._id, name: menuItems[5].name, price: menuItems[5].price, quantity: 1 }
        ],
        status: 'PENDING',
        subtotal: 480,
        tax: 24,
        totalAmount: 504
      },
      {
        tableId: createdTables[1]._id,
        orderNumber: 'ORD-002',
        items: [
          { menuItemId: menuItems[2]._id, name: menuItems[2].name, price: menuItems[2].price, quantity: 1 },
          { menuItemId: menuItems[3]._id, name: menuItems[3].name, price: menuItems[3].price, quantity: 1 }
        ],
        status: 'PREPARING',
        subtotal: 850,
        tax: 42.5,
        totalAmount: 892.5
      }
    ]);

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
