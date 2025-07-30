const mongoose = require('mongoose');
require('dotenv').config();

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true },
  pricing: {
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  amenities: [String],
  images: [String],
  availability: {
    isAvailable: { type: Boolean, default: true },
    unavailableDates: [Date]
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

async function getRoomIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const rooms = await Room.find({}, '_id name pricing.basePrice');
    console.log('Available rooms:');
    rooms.forEach(room => {
      console.log(`ID: ${room._id}, Name: ${room.name}, Price: ${room.pricing?.basePrice}`);
    });
    
    if (rooms.length > 0) {
      console.log('\nUse this room ID for testing:', rooms[0]._id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

getRoomIds();