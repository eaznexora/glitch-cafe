const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Order = require('../models/Order');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// Get Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToday = await Order.find({ createdAt: { $gte: today } });
    const revenue = ordersToday.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
    const orderCount = ordersToday.length;
    const aov = orderCount > 0 ? (revenue / orderCount).toFixed(2) : 0;

    const tables = await Table.find();
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const totalTables = tables.length;

    const pendingTickets = await Order.countDocuments({ status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING'] } });

    res.json({
      revenue,
      orderCount,
      activeTables: `${occupiedTables} / ${totalTables}`,
      pendingTickets,
      aov
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Chart Data
router.get('/dashboard/chart-data', async (req, res) => {
  try {
    const range = req.query.range || 'today';
    // Dummy chart data for now based on range
    const labels = ['10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
    const data = [1200, 2500, 4800, 3200, 1500, 2100, 3000];
    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Live Orders
router.get('/orders/live', async (req, res) => {
  try {
    const activeOrders = await Order.find({ status: { $nin: ['COMPLETED', 'REJECTED'] } })
      .populate('tableId', 'tableNumber')
      .sort({ createdAt: -1 });
    res.json(activeOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Orders (for Master Feed)
router.get('/orders', async (req, res) => {
  try {
    const allOrders = await Order.find()
      .populate('tableId', 'tableNumber')
      .sort({ createdAt: -1 });
    res.json(allOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, paymentStatus, paymentMethod } = req.body;
    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (paymentMethod) update.paymentMethod = paymentMethod;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true }).populate('tableId', 'tableNumber');
    
    // Emit socket event (req.io is passed from server.js)
    if (req.io) {
      req.io.emit('order:status_changed', order);
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CATEGORIES CRUD ---

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MENU ITEMS CRUD ---

router.get('/menu-items', async (req, res) => {
  try {
    const items = await MenuItem.find().populate('categoryId', 'name slug');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu-items', async (req, res) => {
  try {
    const newItem = new MenuItem(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/menu-items/:id', async (req, res) => {
  try {
    const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/menu-items/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/menu-items/:id/stock', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const updated = await MenuItem.findByIdAndUpdate(req.params.id, { isAvailable }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ANALYTICS ---

router.get('/analytics', async (req, res) => {
  try {
    const range = req.query.range || 'today';
    let startDate = new Date();
    let prevStartDate = new Date();
    
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
    } else if (range === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
    } else if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
    } else {
      // Default to today if unknown
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
    }
    
    // Fetch orders for current period
    const currentOrders = await Order.find({ createdAt: { $gte: startDate } }).lean();
    
    // Fallback Dummy Data if no orders (for presentation purposes as requested)
    if (currentOrders.length === 0) {
      return res.json({
        revenue: 12450,
        growth: '+14.5%',
        settledOrders: 42,
        cancelledOrders: 3,
        aov: 296,
        avgPrepTime: '14.2 mins',
        chartData: {
          labels: ['10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'],
          revenue: [1200, 2400, 4800, 3200, 1500, 1800, 2100, 3500],
          volume: [4, 8, 16, 11, 5, 6, 7, 12]
        },
        topItems: [
          { name: 'Margherita Pizza', category: 'Mains', units: 24, revenue: 4776 },
          { name: 'Cold Coffee', category: 'Beverages', units: 31, revenue: 3100 },
          { name: 'Peri Peri Fries', category: 'Starters', units: 19, revenue: 2280 },
          { name: 'Chocolate Brownie', category: 'Desserts', units: 14, revenue: 2100 }
        ],
        payments: {
          upi: 65,
          card: 20,
          cash: 15
        },
        rejections: [
          { reason: 'Item Out of Stock', count: 2 },
          { reason: 'Customer Cancelled', count: 1 }
        ]
      });
    }

    // Real Data Aggregation Logic (If orders exist)
    const revenue = currentOrders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const settledOrders = currentOrders.filter(o => o.status === 'COMPLETED').length;
    const cancelledOrders = currentOrders.filter(o => o.status === 'REJECTED').length;
    const aov = settledOrders > 0 ? (revenue / settledOrders) : 0;
    
    // Basic Payment Breakdown
    let upi = 0, card = 0, cash = 0;
    currentOrders.filter(o => o.paymentStatus === 'PAID').forEach(o => {
      if (o.paymentMethod === 'CARD') card++;
      else if (o.paymentMethod === 'CASH') cash++;
      else upi++; // Default to upi
    });
    const totalPaid = upi + card + cash;
    const payments = totalPaid > 0 ? {
      upi: Math.round((upi/totalPaid)*100),
      card: Math.round((card/totalPaid)*100),
      cash: Math.round((cash/totalPaid)*100)
    } : { upi: 100, card: 0, cash: 0 };
    
    // Top Items
    const itemMap = {};
    currentOrders.filter(o => o.status === 'COMPLETED').forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, category: 'Unknown', units: 0, revenue: 0 };
        itemMap[item.name].units += item.quantity;
        itemMap[item.name].revenue += (item.quantity * item.price);
      });
    });
    const topItems = Object.values(itemMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    
    // Rejections
    const rejMap = {};
    currentOrders.filter(o => o.status === 'REJECTED').forEach(order => {
      const r = order.rejectionReason || 'Unknown';
      rejMap[r] = (rejMap[r] || 0) + 1;
    });
    const rejections = Object.keys(rejMap).map(k => ({ reason: k, count: rejMap[k] }));
    
    // Chart Data (simple hourly aggregate for 'today')
    const chartData = { labels: [], revenue: [], volume: [] };
    if (range === 'today' || range === 'yesterday') {
      const hourMap = {};
      currentOrders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        const label = h > 12 ? `${h-12} PM` : (h === 12 ? '12 PM' : `${h} AM`);
        if (!hourMap[label]) hourMap[label] = { r: 0, v: 0, h };
        if (o.status === 'COMPLETED') {
          hourMap[label].r += o.totalAmount;
          hourMap[label].v += 1;
        }
      });
      Object.values(hourMap).sort((a,b) => a.h - b.h).forEach(obj => {
        const label = obj.h > 12 ? `${obj.h-12} PM` : (obj.h === 12 ? '12 PM' : `${obj.h} AM`);
        chartData.labels.push(label);
        chartData.revenue.push(obj.r);
        chartData.volume.push(obj.v);
      });
    } else {
      // Daily aggregate for 7d/30d
      const dayMap = {};
      currentOrders.forEach(o => {
        const d = new Date(o.createdAt).toLocaleDateString();
        if (!dayMap[d]) dayMap[d] = { r: 0, v: 0, timestamp: new Date(o.createdAt).getTime() };
        if (o.status === 'COMPLETED') {
          dayMap[d].r += o.totalAmount;
          dayMap[d].v += 1;
        }
      });
      Object.keys(dayMap).sort((a,b) => dayMap[a].timestamp - dayMap[b].timestamp).forEach(d => {
        chartData.labels.push(d);
        chartData.revenue.push(dayMap[d].r);
        chartData.volume.push(dayMap[d].v);
      });
    }

    res.json({
      revenue,
      growth: '+0.0%', // Real growth calculation omitted for brevity
      settledOrders,
      cancelledOrders,
      aov: Math.round(aov),
      avgPrepTime: 'N/A', // Time tracking omitted for brevity
      chartData,
      topItems,
      payments,
      rejections
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
