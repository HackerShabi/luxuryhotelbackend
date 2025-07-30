const mongoose = require('mongoose');

// Simple Room schema for seeding
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  capacity: {
    adults: { type: Number, required: true },
    children: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  pricing: {
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0.12 }
  },
  amenities: [{ type: String }],
  images: [{ type: String }],
  availability: {
    isActive: { type: Boolean, default: true },
    maxOccupancy: { type: Number, required: true }
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

const sampleRooms = [
  {
    name: 'Deluxe Ocean View Suite',
    type: 'suite',
    description: 'Luxurious suite with panoramic ocean views, king-size bed, and private balcony.',
    capacity: {
      adults: 2,
      children: 1,
      total: 3
    },
    pricing: {
      basePrice: 299,
      currency: 'USD',
      taxRate: 0.12
    },
    amenities: ['Ocean View', 'King Bed', 'Private Balcony', 'Mini Bar', 'WiFi', 'Room Service'],
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    availability: {
      isActive: true,
      maxOccupancy: 3
    },
    rating: {
      average: 4.8,
      count: 124
    }
  },
  {
    name: 'Standard Double Room',
    type: 'standard',
    description: 'Comfortable double room with modern amenities and city view.',
    capacity: {
      adults: 2,
      children: 0,
      total: 2
    },
    pricing: {
      basePrice: 149,
      currency: 'USD',
      taxRate: 0.12
    },
    amenities: ['City View', 'Double Bed', 'WiFi', 'Air Conditioning', 'TV'],
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    availability: {
      isActive: true,
      maxOccupancy: 2
    },
    rating: {
      average: 4.2,
      count: 89
    }
  },
  {
    name: 'Presidential Suite',
    type: 'presidential',
    description: 'Ultimate luxury with separate living area, dining room, and premium amenities.',
    capacity: {
      adults: 4,
      children: 2,
      total: 6
    },
    pricing: {
      basePrice: 599,
      currency: 'USD',
      taxRate: 0.12
    },
    amenities: ['Ocean View', 'King Bed', 'Living Area', 'Dining Room', 'Butler Service', 'Private Terrace', 'Jacuzzi'],
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    availability: {
      isActive: true,
      maxOccupancy: 6
    },
    rating: {
      average: 4.9,
      count: 45
    }
  }
];

async function seedRooms() {
  try {
    // Use the same connection string as the server
    const mongoUri = 'mongodb+srv://luxuryhotel:luxury123@cluster0.le5nrtl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Clear existing rooms
    await Room.deleteMany({});
    console.log('Cleared existing rooms');
    
    // Insert sample rooms
    const rooms = await Room.insertMany(sampleRooms);
    console.log(`Inserted ${rooms.length} sample rooms`);
    
    rooms.forEach(room => {
      console.log(`- ${room.name} (${room.type}) - $${room.pricing.basePrice}`);
    });
    
    console.log('Sample rooms created successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding rooms:', error.message);
    process.exit(1);
  }
}

seedRooms();