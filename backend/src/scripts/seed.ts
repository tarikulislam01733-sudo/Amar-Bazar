import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../modules/user/user.model';
import { Listing } from '../modules/listings/listing.model';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/amar-bazar');
  console.log('Connected.');

  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Listing.deleteMany({});
  await mongoose.connection.collection('conversations').deleteMany({});
  await mongoose.connection.collection('safe_meetup_spots').deleteMany({});

  console.log('Seeding Users...');
  const users = await User.insertMany([
    {
      phone: '+8801700000001',
      role: 'registered',
      displayName: 'Normal User',
      trustScore: 5.0,
      totalDeals: 0,
      totalReviews: 0,
      status: 'active'
    },
    {
      phone: '+8801700000002',
      role: 'verified',
      displayName: 'Verified Seller',
      nidHash: 'hash_1234567890',
      legalNameBangla: 'ভেরিফাইড সেলার',
      trustScore: 8.5,
      totalDeals: 12,
      totalReviews: 5,
      status: 'active'
    },
    {
      phone: '+8801700000003',
      role: 'moderator',
      displayName: 'System Moderator',
      trustScore: 10.0,
      totalDeals: 0,
      totalReviews: 0,
      status: 'active'
    }
  ]);
  console.log(`Inserted ${users.length} users.`);

  console.log('Seeding Listings...');
  const listings = await Listing.insertMany([
    {
      sellerId: users[1]._id,
      title: 'iPhone 13 Pro Max - Mint Condition',
      description: 'Used for 6 months. No scratches.',
      category: 'smartphones',
      price: 85000,
      condition: 'Like New',
      location: {
        type: 'Point',
        coordinates: [90.3995, 23.7772], // Mohakhali
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Mohakhali'
      },
      imageUrls: ['https://example.com/img1.jpg'],
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      sellerId: users[0]._id,
      title: 'MacBook Pro M1 2020',
      description: 'Need urgent money. Cycle count 150.',
      category: 'laptops',
      price: 90000,
      condition: 'Good',
      location: {
        type: 'Point',
        coordinates: [90.3665, 23.8223], // Mirpur
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Mirpur'
      },
      imageUrls: ['https://example.com/img2.jpg'],
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      sellerId: users[1]._id,
      title: 'Yamaha R15 V3',
      description: 'Registered in Mirpur BRTA. Single hand driven.',
      category: 'motorbikes',
      price: 380000,
      condition: 'Good',
      location: {
        type: 'Point',
        coordinates: [90.4125, 23.8103], // Uttara
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Uttara'
      },
      imageUrls: ['https://example.com/img3.jpg'],
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      sellerId: users[0]._id,
      title: 'Sony Bravia 55 inch 4K TV',
      description: 'Bought last year. Selling due to relocation.',
      category: 'electronics',
      price: 55000,
      condition: 'Like New',
      location: {
        type: 'Point',
        coordinates: [90.4223, 23.8131], // Bashundhara
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Bashundhara'
      },
      imageUrls: ['https://example.com/img4.jpg'],
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      sellerId: users[1]._id,
      title: 'Wooden Dining Table with 6 Chairs',
      description: 'Solid wood. Slight scratches on top.',
      category: 'furniture',
      price: 20000,
      condition: 'Fair',
      location: {
        type: 'Point',
        coordinates: [90.3833, 23.7500], // Dhanmondi
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://example.com/img5.jpg'],
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);
  console.log(`Inserted ${listings.length} listings.`);

  console.log('Seeding Conversations...');
  const conversations = await mongoose.connection.collection('conversations').insertMany([
    {
      listingId: listings[0]._id,
      participants: [users[0]._id, users[1]._id],
      lastMessage: 'Is this available?',
      updatedAt: new Date(),
      createdAt: new Date(),
      status: 'open'
    },
    {
      listingId: listings[1]._id,
      participants: [users[1]._id, users[0]._id],
      lastMessage: 'Price fixed?',
      updatedAt: new Date(),
      createdAt: new Date(),
      status: 'open'
    }
  ]);
  console.log(`Inserted ${conversations.insertedCount} conversations.`);

  console.log('Seeding Safe Meetup Spots...');
  const spots = await mongoose.connection.collection('safe_meetup_spots').insertMany([
    {
      name: 'Mirpur 10 Metro Station',
      location: { type: 'Point', coordinates: [90.3697, 23.8068] },
      verifiedBy: 'Dhaka Metro',
      createdAt: new Date()
    },
    {
      name: 'Bashundhara City Mall',
      location: { type: 'Point', coordinates: [90.3905, 23.7495] },
      verifiedBy: 'Security',
      createdAt: new Date()
    },
    {
      name: 'Gulshan Police Station',
      location: { type: 'Point', coordinates: [90.4150, 23.7915] },
      verifiedBy: 'Bangladesh Police',
      createdAt: new Date()
    },
    {
      name: 'Uttara Sector 3 Metro Station',
      location: { type: 'Point', coordinates: [90.3970, 23.8732] },
      verifiedBy: 'Dhaka Metro',
      createdAt: new Date()
    },
    {
      name: 'Jamuna Future Park',
      location: { type: 'Point', coordinates: [90.4225, 23.8135] },
      verifiedBy: 'Security',
      createdAt: new Date()
    }
  ]);
  console.log(`Inserted ${spots.insertedCount} safe meetup spots.`);

  console.log('Disconnecting...');
  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
