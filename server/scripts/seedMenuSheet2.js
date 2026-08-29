const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const menuData = [
  // 1. BITES AND SNACKS
  {
    category: { name: 'Bites and Snacks', slug: 'bites-and-snacks', displayOrder: 11 },
    items: [
      { name: 'Chicken Nuggets', price: 140, isVeg: false, isSpecial: false },
      { name: 'Chicken Cheese Ball', price: 140, isVeg: false, isSpecial: false },
      { name: 'Chicken Popcorn', price: 150, isVeg: false, isSpecial: false },
      { name: 'Chicken Peri-peri Popcorn', price: 160, isVeg: false, isSpecial: false },
      { name: 'Chicken Hot And Spicy Popcorn', price: 160, isVeg: false, isSpecial: false },
      { name: 'Kurkure Popcorn', price: 150, isVeg: false, isSpecial: false },
      { name: 'Kurkure Peri Peri Popcorn', price: 160, isVeg: false, isSpecial: false },
      { name: 'Chicken Herb Strips', price: 170, isVeg: false, isSpecial: false },
      { name: 'Chicken Peri Peri Strips', price: 170, isVeg: false, isSpecial: false },
      { name: 'Chicken Hot And Spicy Strips', price: 170, isVeg: false, isSpecial: false },
      { name: 'Herb Broasted Chicken', price: 240, isVeg: false, isSpecial: false },
      { name: 'Peri Peri Broasted Chicken', price: 259, isVeg: false, isSpecial: false },
      { name: 'Hot And Spicy Broasted Chicken', price: 250, isVeg: false, isSpecial: false },
      { name: 'Double Down', price: 280, isVeg: false, isSpecial: true }
    ]
  },

  // 2. CHICKEN WINGS
  {
    category: { name: 'Chicken Wings', slug: 'chicken-wings', displayOrder: 12 },
    items: [
      { name: 'Crispy Broasted Wings', price: 160, isVeg: false, isSpecial: false },
      { name: 'Peri-Peri Inferno Wings', price: 170, isVeg: false, isSpecial: false },
      { name: 'Hot And Spicy Wings', price: 170, isVeg: false, isSpecial: false },
      { name: 'Tandoori Blaze Wings', price: 180, isVeg: false, isSpecial: false },
      { name: 'Chipotle Fusion Wings', price: 180, isVeg: false, isSpecial: false },
      { name: 'Cheesy Melt Wings', price: 180, isVeg: false, isSpecial: false },
      { name: 'THE GLITCH Schezwan Wings', price: 200, isVeg: false, isSpecial: true }
    ]
  },

  // 3. MAGGI
  {
    category: { name: 'Maggi', slug: 'maggi', displayOrder: 13 },
    items: [
      { name: 'Classic Maggi', price: 60, isVeg: true, isSpecial: false },
      { name: 'Double Masala Maggi', price: 70, isVeg: true, isSpecial: false },
      { name: 'Corn And Cheese Maggi', price: 80, isVeg: true, isSpecial: false },
      { name: 'Garden Blaze Maggi', price: 80, isVeg: true, isSpecial: false },
      { name: 'THE GLITCH Signature Maggi', price: 120, isVeg: true, isSpecial: true }
    ]
  },

  // 4. FRIES
  {
    category: { name: 'Fries', slug: 'fries', displayOrder: 14 },
    items: [
      { name: 'Classic Salted Fries', price: 90, isVeg: true, isSpecial: false },
      { name: 'Peri - Peri Fries', price: 110, isVeg: true, isSpecial: false },
      { name: 'Cheesy Fries', price: 120, isVeg: true, isSpecial: false },
      { name: 'Chipotle Fries', price: 120, isVeg: true, isSpecial: false },
      { name: 'Tandoori Fries', price: 120, isVeg: true, isSpecial: false },
      { name: 'Peri Peri Cheesy Fries', price: 140, isVeg: true, isSpecial: false }
    ]
  },

  // 5. CHICKEN LOADED FRIES
  {
    category: { name: 'Chicken Loaded Fries', slug: 'chicken-loaded-fries', displayOrder: 15 },
    items: [
      { name: 'Smoky Bbq Chicken Loaded Fries', price: 160, isVeg: false, isSpecial: false },
      { name: 'Tandoori Flame Chicken Loaded Fries', price: 160, isVeg: false, isSpecial: false },
      { name: 'Broasted Cheesy Chicken Loaded Fries', price: 170, isVeg: false, isSpecial: false },
      { name: 'Peri - Peri Chicken Cheese Loaded Fries', price: 170, isVeg: false, isSpecial: false },
      { name: 'THE GLITCH Loaded Fries', price: 190, isVeg: false, isSpecial: true },
      { name: 'Oven Baked Gourment Fries', price: 220, isVeg: false, isSpecial: true }
    ]
  },

  // 6. LONGER / SUBS (VEG & CHICKEN)
  {
    category: { name: 'Longers and Subs', slug: 'longers-and-subs', displayOrder: 16 },
    items: [
      // Veg
      { name: 'Veg. Cheesy Longer', price: 130, isVeg: true, isSpecial: false },
      { name: 'Tandoori Veg. Cheese Longer', price: 140, isVeg: true, isSpecial: false },
      { name: 'Chipotle Veg. Cheese Longer', price: 140, isVeg: true, isSpecial: false },
      { name: 'THE GLITCH Signature Veg. Longer', price: 150, isVeg: true, isSpecial: true },
      // Non-Veg
      { name: 'Chicken Classic Longer', price: 140, isVeg: false, isSpecial: false },
      { name: 'Tandoori Flame Longer', price: 150, isVeg: false, isSpecial: false },
      { name: 'Barbeque Smokehouse Longer', price: 150, isVeg: false, isSpecial: false },
      { name: 'Jalapeno Punch Longer', price: 150, isVeg: false, isSpecial: false },
      { name: 'Peri Peri Inferno Longer', price: 150, isVeg: false, isSpecial: false },
      { name: 'Chipotle Fusion Longer', price: 160, isVeg: false, isSpecial: false },
      { name: 'Chicken Zinger Cheese Longer', price: 170, isVeg: false, isSpecial: false },
      { name: 'THE GLITCH Fillet Longer', price: 180, isVeg: false, isSpecial: true }
    ]
  },

  // 7. GARLIC BREAD
  {
    category: { name: 'Garlic Bread', slug: 'garlic-bread', displayOrder: 17 },
    items: [
      // Veg
      { name: 'Veg - Classic Garlic Bread', price: 90, isVeg: true, isSpecial: false },
      { name: 'Cheese Garlic Bread', price: 130, isVeg: true, isSpecial: false },
      { name: 'Corn & Cheese Garlic Bread', price: 140, isVeg: true, isSpecial: false },
      { name: 'Garden Blaze Garlic Bread', price: 150, isVeg: true, isSpecial: false },
      // Non-Veg
      { name: 'Chicken Cheese Garlic Bread', price: 180, isVeg: false, isSpecial: false },
      { name: 'Chicken Tikka Garlic Bread', price: 180, isVeg: false, isSpecial: false },
      { name: 'Chicken Tandoori Garlic Bread', price: 180, isVeg: false, isSpecial: false },
      { name: 'Chicken Mexican Garlic Bread', price: 180, isVeg: false, isSpecial: false }
    ]
  },

  // 8. PASTA
  {
    category: { name: 'Pasta', slug: 'pasta', displayOrder: 18 },
    items: [
      {
        name: 'Fiery Arrabbiata Twist Pasta',
        price: 170,
        isVeg: true,
        isSpecial: false,
        sizes: [
          { name: 'Veg', price: 170 },
          { name: 'Non Veg', price: 220 }
        ]
      },
      {
        name: 'Blush Pink Fusion Pasta',
        price: 180,
        isVeg: true,
        isSpecial: false,
        sizes: [
          { name: 'Veg', price: 180 },
          { name: 'Non Veg', price: 230 }
        ]
      },
      {
        name: 'Classic Alfredo Bliss Pasta',
        price: 200,
        isVeg: true,
        isSpecial: false,
        sizes: [
          { name: 'Veg', price: 200 },
          { name: 'Non Veg', price: 250 }
        ]
      }
    ]
  },

  // 9. MOMOS (VEG, PANEER, CHICKEN)
  {
    category: { name: "Momo's", slug: 'momos', displayOrder: 19 },
    items: [
      // Veg
      { name: 'Crispy Fried Veg Momos', price: 130, isVeg: true, isSpecial: false },
      { name: 'Tandoori Veg Momos', price: 150, isVeg: true, isSpecial: false },
      { name: 'Chipotle Chaos Veg Momos', price: 150, isVeg: true, isSpecial: false },
      { name: 'Sriracha Swirl Veg Momos', price: 150, isVeg: true, isSpecial: false },
      { name: 'Veg Kurkure Momos', price: 160, isVeg: true, isSpecial: false },
      // Paneer
      { name: 'Crispy Fried Paneer Momos', price: 160, isVeg: true, isSpecial: false },
      { name: 'Tandoori Paneer Momos', price: 170, isVeg: true, isSpecial: false },
      { name: 'Chipotle Chaos Paneer Momos', price: 170, isVeg: true, isSpecial: false },
      { name: 'Sriracha Swirl Paneer Momos', price: 170, isVeg: true, isSpecial: false },
      { name: 'Paneer Kurkure Momos', price: 180, isVeg: true, isSpecial: false },
      // Chicken
      { name: 'Crispy Chicken Whopper Momos', price: 160, isVeg: false, isSpecial: false },
      { name: 'Tandoori Twist Chicken Momos', price: 170, isVeg: false, isSpecial: false },
      { name: 'Korean Kick Chicken Momos', price: 170, isVeg: false, isSpecial: false },
      { name: 'Sriracha Swirl Chicken Momos', price: 170, isVeg: false, isSpecial: false },
      { name: 'Chipotle Chaos Chicken Momos', price: 170, isVeg: false, isSpecial: false },
      { name: 'Chicken Cheese Meltdown Whopper Momos', price: 180, isVeg: false, isSpecial: true },
      { name: 'Chicken Chowranghee Momos', price: 180, isVeg: false, isSpecial: true }
    ]
  },

  // 10. VEG & PANEER SANDWICHES (Added to Sandwiches Category)
  {
    category: { name: 'Sandwiches', slug: 'sandwiches', displayOrder: 1 },
    items: [
      // Veg Sandwiches
      { name: 'Bombay Veg Grill Sandwich', price: 100, isVeg: true, isSpecial: false },
      { name: 'Bombay Veg Cheese Grill Sandwich', price: 120, isVeg: true, isSpecial: false },
      { name: 'Tandoori Veg Sandwich', price: 130, isVeg: true, isSpecial: false },
      { name: 'Makhni Sandwich', price: 130, isVeg: true, isSpecial: false },
      { name: 'Mexican Sandwich', price: 130, isVeg: true, isSpecial: false },
      { name: 'Italian Sandwich', price: 130, isVeg: true, isSpecial: false },
      { name: 'Veg Special Sandwich', price: 150, isVeg: true, isSpecial: false },
      { name: 'THE GLITCH Melting Cheese Veg Sandwich', price: 170, isVeg: true, isSpecial: true },
      // Paneer Sandwiches
      { name: 'Tandoori Paneer Sandwich', price: 150, isVeg: true, isSpecial: false },
      { name: 'Paneer Italiano Sandwich', price: 160, isVeg: true, isSpecial: false },
      { name: 'Chipotle Paneer Sandwich', price: 160, isVeg: true, isSpecial: false },
      { name: 'Peri - Peri Paneer Sandwich', price: 160, isVeg: true, isSpecial: false },
      { name: 'THE GLITCH Paneer Sandwich', price: 180, isVeg: true, isSpecial: true },
      // Chicken Grill Sandwiches
      { name: 'Butter Chicken Sandwich', price: 150, isVeg: false, isSpecial: false },
      { name: 'Chicken Cheese Grill Sandwich', price: 160, isVeg: false, isSpecial: false },
      { name: 'Italian Chicken Sandwich', price: 160, isVeg: false, isSpecial: false },
      { name: 'Chipotle Chicken Sandwich', price: 160, isVeg: false, isSpecial: false },
      { name: 'Chicken Tandoori Grill Sandwich', price: 170, isVeg: false, isSpecial: false },
      { name: 'Chicken Mexican Grill Sandwich', price: 170, isVeg: false, isSpecial: false }
    ]
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MongoDB URI missing in .env');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    for (const group of menuData) {
      const cat = await Category.findOneAndUpdate(
        { slug: group.category.slug },
        { 
          name: group.category.name, 
          slug: group.category.slug, 
          displayOrder: group.category.displayOrder,
          isActive: true 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`\n📂 Category: ${cat.name} (${cat._id})`);

      for (const item of group.items) {
        const itemDoc = {
          name: item.name,
          categoryId: cat._id,
          categorySlug: cat.slug,
          price: item.price,
          description: item.description || '',
          isVeg: item.isVeg,
          isSpecial: item.isSpecial,
          isAvailable: true,
          sizes: item.sizes || [],
          toppings: item.toppings || []
        };

        await MenuItem.findOneAndUpdate(
          { name: item.name, categoryId: cat._id },
          itemDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`  ✔ [${item.isVeg ? 'VEG' : 'NON-VEG'}] ${item.name} - ₹${item.price}`);
      }
    }

    console.log('\n🎉 Menu Sheet 2 successfully seeded into MongoDB!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
