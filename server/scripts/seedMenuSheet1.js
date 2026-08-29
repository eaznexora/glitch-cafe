const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const menuData = [
  // 1. CHICKEN BAKED SANDWICH
  {
    category: { name: 'Sandwiches', slug: 'sandwiches', displayOrder: 1 },
    items: [
      { name: 'Open Club Sandwich', price: 180, isVeg: false, isSpecial: false },
      { name: 'Chicken Cheese Sandwich', price: 190, isVeg: false, isSpecial: false },
      { name: 'Chicken Tandoori Sandwich', price: 200, isVeg: false, isSpecial: false },
      { name: 'Chicken Mexican Sandwich', price: 200, isVeg: false, isSpecial: false },
      { name: 'Chicken Junglee Cheese Sandwich', price: 200, isVeg: false, isSpecial: false },
      { name: 'THE GLITCH Melting Cheese Sandwich', price: 230, isVeg: false, isSpecial: true }
    ]
  },

  // 2. WRAPS (VEG, PANEER, CHICKEN)
  {
    category: { name: 'Wraps', slug: 'wraps', displayOrder: 2 },
    items: [
      // Veg
      { name: 'Classic Veg Wrap', price: 80, isVeg: true, isSpecial: false },
      { name: 'Veg Cheese Wrap', price: 100, isVeg: true, isSpecial: false },
      { name: 'Tandoori Wrap (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Peri Peri Wrap (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Mexican Wrap (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Korean Wrap (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Glitch Supreme Wrap (Veg)', price: 150, isVeg: true, isSpecial: true },
      // Paneer
      { name: 'Crispy Paneer Wrap', price: 100, isVeg: true, isSpecial: false },
      { name: 'Paneer Cheese Wrap', price: 120, isVeg: true, isSpecial: false },
      { name: 'Tandoori Paneer Wrap', price: 130, isVeg: true, isSpecial: false },
      { name: 'Peri Peri Paneer Wrap', price: 130, isVeg: true, isSpecial: false },
      { name: 'GLITCH Supreme Paneer Wrap', price: 160, isVeg: true, isSpecial: true },
      // Chicken
      { name: 'Crispy Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Spicy Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Tandoori Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Korean Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Chipotle Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Peri Peri Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Sriracha Chicken Wrap', price: 150, isVeg: false, isSpecial: false },
      { name: 'Classic Chicken Cheese Wrap', price: 170, isVeg: false, isSpecial: false },
      { name: 'THE GLITCH Loaded Chicken Wrap', price: 200, isVeg: false, isSpecial: true }
    ]
  },

  // 3. BURGERS
  {
    category: { name: 'Burgers', slug: 'burgers', displayOrder: 3 },
    items: [
      // Veg
      { name: 'Veg Burger', price: 80, isVeg: true, isSpecial: false },
      { name: 'Veg Cheese Burger', price: 100, isVeg: true, isSpecial: false },
      { name: 'Mexican Burger (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Tandoori Burger (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Korean Burger (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Peri Peri Burger (Veg)', price: 120, isVeg: true, isSpecial: false },
      { name: 'Classic Cheese Burger', price: 140, isVeg: true, isSpecial: false },
      // Paneer
      { name: 'Crispy Paneer Burger', price: 140, isVeg: true, isSpecial: false },
      { name: 'Tandoori Paneer Burger', price: 160, isVeg: true, isSpecial: false },
      { name: 'Peri Peri Paneer Burger', price: 160, isVeg: true, isSpecial: false },
      { name: 'THE GLITCH Double Decker Paneer Burger', price: 180, isVeg: true, isSpecial: true },
      // Chicken
      { name: 'Chicken Burger', price: 100, isVeg: false, isSpecial: false },
      { name: 'Chicken Cheese Burger', price: 120, isVeg: false, isSpecial: false },
      { name: 'Chicken Mexican Burger', price: 130, isVeg: false, isSpecial: false },
      { name: 'Crispy Chicken Burger', price: 130, isVeg: false, isSpecial: false },
      { name: 'Chicken Popcorn Burger', price: 140, isVeg: false, isSpecial: false },
      { name: 'Chicken Barbeque Grill Burger', price: 150, isVeg: false, isSpecial: false },
      { name: 'Zinger Burger', price: 150, isVeg: false, isSpecial: false },
      { name: 'Tandoori Zinger Burger', price: 160, isVeg: false, isSpecial: false },
      { name: 'Peri Peri Zinger Burger', price: 160, isVeg: false, isSpecial: false },
      { name: 'Korean Zinger Burger', price: 160, isVeg: false, isSpecial: false },
      { name: 'The Boss Burger', price: 180, isVeg: false, isSpecial: true },
      { name: 'THE GLITCH Signature Burger (Double Trouble)', price: 200, isVeg: false, isSpecial: true }
    ]
  },

  // 4. PIZZA (VEG & NON-VEG with SIZES)
  {
    category: { name: 'Pizza', slug: 'pizza', displayOrder: 4 },
    items: [
      // Veg
      {
        name: 'Margherita Pizza',
        price: 120,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 120 }, { name: 'Medium', price: 170 }, { name: 'Large', price: 240 }]
      },
      {
        name: 'Onion Pizza',
        price: 140,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 140 }, { name: 'Medium', price: 190 }, { name: 'Large', price: 260 }]
      },
      {
        name: 'Onion Capsicum Pizza',
        price: 150,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 150 }, { name: 'Medium', price: 200 }, { name: 'Large', price: 270 }]
      },
      {
        name: 'Corn And Cheese Pizza',
        price: 150,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 150 }, { name: 'Medium', price: 200 }, { name: 'Large', price: 270 }]
      },
      {
        name: 'Italian Pizza',
        price: 150,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 150 }, { name: 'Medium', price: 200 }, { name: 'Large', price: 280 }]
      },
      {
        name: 'Veggie Supreme Pizza',
        price: 160,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 160 }, { name: 'Medium', price: 240 }, { name: 'Large', price: 320 }]
      },
      {
        name: 'THE GLITCH Veg Exotica Pizza',
        price: 180,
        isVeg: true,
        isSpecial: true,
        sizes: [{ name: 'Regular', price: 180 }, { name: 'Medium', price: 260 }, { name: 'Large', price: 380 }]
      },
      {
        name: 'Paneer Tikka Pizza',
        price: 160,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 160 }, { name: 'Medium', price: 240 }, { name: 'Large', price: 320 }]
      },
      {
        name: 'Peri - Peri Paneer Pizza',
        price: 170,
        isVeg: true,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 170 }, { name: 'Medium', price: 250 }, { name: 'Large', price: 330 }]
      },
      // Non-Veg
      {
        name: 'Smoky Bbq Bliss Pizza',
        price: 250,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 250 }, { name: 'Medium', price: 320 }, { name: 'Large', price: 420 }]
      },
      {
        name: 'Tandoori Delight Pizza',
        price: 260,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 260 }, { name: 'Medium', price: 330 }, { name: 'Large', price: 430 }]
      },
      {
        name: 'Italiano Chicken Pizza',
        price: 260,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 260 }, { name: 'Medium', price: 330 }, { name: 'Large', price: 430 }]
      },
      {
        name: 'Chicken Tikka Pizza',
        price: 270,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 270 }, { name: 'Medium', price: 340 }, { name: 'Large', price: 440 }]
      },
      {
        name: 'Spicy Mexican Chicken Pizza',
        price: 280,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 280 }, { name: 'Medium', price: 350 }, { name: 'Large', price: 450 }]
      },
      {
        name: 'Simply Chicken Pizza',
        price: 280,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 280 }, { name: 'Medium', price: 350 }, { name: 'Large', price: 450 }]
      },
      {
        name: 'Pepperoni Pizza',
        price: 300,
        isVeg: false,
        isSpecial: false,
        sizes: [{ name: 'Regular', price: 300 }, { name: 'Medium', price: 370 }, { name: 'Large', price: 470 }]
      },
      {
        name: 'THE GLITCH Italian Feast Pizza',
        price: 320,
        isVeg: false,
        isSpecial: true,
        sizes: [{ name: 'Regular', price: 320 }, { name: 'Medium', price: 390 }, { name: 'Large', price: 490 }]
      },
      {
        name: 'THE GLITCH Supreme Chicken Pizza',
        price: 320,
        isVeg: false,
        isSpecial: true,
        sizes: [{ name: 'Regular', price: 320 }, { name: 'Medium', price: 390 }, { name: 'Large', price: 490 }]
      }
    ]
  },

  // 5. MOCKTAILS
  {
    category: { name: 'Mocktail', slug: 'mocktail', displayOrder: 5 },
    items: [
      { name: 'Star Squash Mocktail', price: 90, isVeg: true, isSpecial: false },
      { name: 'Orange Splash Mocktail', price: 90, isVeg: true, isSpecial: false },
      { name: 'Lemon Ginger Mocktail', price: 90, isVeg: true, isSpecial: false },
      { name: 'Kacchi Kairi Mocktail', price: 90, isVeg: true, isSpecial: false },
      { name: 'Black Currant Mocktail', price: 100, isVeg: true, isSpecial: false },
      { name: 'Kiwi Mocktail', price: 100, isVeg: true, isSpecial: false },
      { name: 'Guava Mocktail', price: 100, isVeg: true, isSpecial: false },
      { name: 'Strawberry Mocktail', price: 100, isVeg: true, isSpecial: false },
      { name: 'Pineapple Mojito', price: 100, isVeg: true, isSpecial: false },
      { name: 'Litchi Mojito', price: 100, isVeg: true, isSpecial: false },
      { name: 'Watermelon Mojito', price: 100, isVeg: true, isSpecial: false },
      { name: 'Pina Colada', price: 120, isVeg: true, isSpecial: false },
      { name: 'Mint Mojito', price: 120, isVeg: true, isSpecial: false },
      { name: 'Blue Curacao', price: 120, isVeg: true, isSpecial: false }
    ]
  },

  // 6. MILKSHAKES
  {
    category: { name: 'Milkshake', slug: 'milkshake', displayOrder: 6 },
    items: [
      { name: 'Banana Milkshake', price: 80, isVeg: true, isSpecial: false },
      { name: 'Banana Date Milkshake', price: 100, isVeg: true, isSpecial: false },
      { name: 'Vanilla Milkshake', price: 120, isVeg: true, isSpecial: false },
      { name: 'Oreo Milkshake', price: 120, isVeg: true, isSpecial: false },
      { name: 'Strawberry Milkshake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Mango Milkshake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Chocolate (Peanut Butter) Milkshake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Chocolate Milkshake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Kitkat Milkshake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Sitaphal Milkshake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Brownie Milkshake', price: 170, isVeg: true, isSpecial: false },
      { name: 'Ferrero Rocher Milkshake', price: 170, isVeg: true, isSpecial: true }
    ]
  },

  // 7. WAFFLE SANDWICHES
  {
    category: { name: 'Waffle Sandwiches', slug: 'waffle-sandwiches', displayOrder: 7 },
    items: [
      { name: 'Dark Chocolate Heaven Waffle', price: 130, isVeg: true, isSpecial: false },
      { name: 'Milky Mania Delight Waffle', price: 130, isVeg: true, isSpecial: false },
      { name: 'Mocha Coffee Kiss Waffle', price: 130, isVeg: true, isSpecial: false },
      { name: 'Butterscotch Gold Waffle', price: 130, isVeg: true, isSpecial: false },
      { name: 'Almond Affair Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Oreo & Cream Dream Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Red Velvet Romance Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Blueberry Burst Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Strawberry Splash Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Kitkat Crunch Affair Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Double Chocolate Waffle', price: 140, isVeg: true, isSpecial: false },
      { name: 'Lotus Biscoff Bliss Waffle', price: 150, isVeg: true, isSpecial: false },
      { name: 'Cookie Monster Waffle', price: 150, isVeg: true, isSpecial: false },
      { name: 'Naked Nutella Indulgence Waffle', price: 160, isVeg: true, isSpecial: false },
      { name: 'Triple Chocolate Madness Waffle', price: 160, isVeg: true, isSpecial: false },
      { name: 'Kunafa Royal Waffle', price: 160, isVeg: true, isSpecial: true }
    ]
  },

  // 8. BUBBLE WAFFLES
  {
    category: { name: 'Bubble Waffle', slug: 'bubble-waffle', displayOrder: 8 },
    items: [
      { name: 'Kitkat Affair Bubble Waffle', price: 350, isVeg: true, isSpecial: false },
      { name: 'Naked Nutella Bubble Waffle', price: 370, isVeg: true, isSpecial: false },
      { name: 'Cookies & Cream Bubble Waffle', price: 360, isVeg: true, isSpecial: false },
      { name: 'Lotus Biscoff Bubble Waffle', price: 370, isVeg: true, isSpecial: false },
      { name: 'Strawberry Blast Bubble Waffle', price: 370, isVeg: true, isSpecial: false },
      { name: 'The Triple Chocolate Bubble Waffle', price: 370, isVeg: true, isSpecial: false },
      { name: 'Ferrero Rocher Bubble Waffle', price: 370, isVeg: true, isSpecial: true },
      { name: 'Kunafa Bubble Waffle', price: 380, isVeg: true, isSpecial: true }
    ]
  },

  // 9. MINI PANCAKES
  {
    category: { name: 'Mini Pancake', slug: 'mini-pancake', displayOrder: 9 },
    items: [
      { name: 'Honey Banana Mini Pancake', price: 90, isVeg: true, isSpecial: false },
      { name: 'Dark Chocolate Heaven Mini Pancake', price: 100, isVeg: true, isSpecial: false },
      { name: 'Milky Mania Mini Pancake', price: 100, isVeg: true, isSpecial: false },
      { name: 'Oreo And Dream Mini Pancake', price: 120, isVeg: true, isSpecial: false },
      { name: 'Cookie Monster Mini Pancake', price: 130, isVeg: true, isSpecial: false },
      { name: 'Butterscotch Mini Pancake', price: 130, isVeg: true, isSpecial: false },
      { name: 'Red Velvet Mini Pancake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Blueberry Blast Mini Pancake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Strawberry Blast Mini Pancake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Kitkat Affair Mini Pancake', price: 140, isVeg: true, isSpecial: false },
      { name: 'Lotus Biscoff Mini Pancake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Naked Nutella Mini Pancake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Double Chocolate Mini Pancake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Triple Chocolate Mini Pancake', price: 150, isVeg: true, isSpecial: false },
      { name: 'Kunafa Kiss Mini Pancake', price: 150, isVeg: true, isSpecial: true }
    ]
  },

  // 10. DESSERTS
  {
    category: { name: 'Desserts', slug: 'desserts', displayOrder: 10 },
    items: [
      { name: 'Cream Kunafa', price: 280, isVeg: true, isSpecial: false },
      { name: 'Caramel Kunafa', price: 330, isVeg: true, isSpecial: false },
      { name: 'Nutella Kunafa', price: 430, isVeg: true, isSpecial: false },
      { name: 'Choco Lava Cake', price: 70, isVeg: true, isSpecial: false }
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
      // 1. Upsert Category
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

      // 2. Upsert Menu Items
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

    console.log('\n🎉 Menu Sheet 1 successfully seeded into MongoDB!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
