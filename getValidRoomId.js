const mongoose = require('mongoose');
const Room = require('./models/Room');
require('dotenv').config();

async function getValidRoomId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const rooms = await Room.find({}).limit(1);
    if (rooms.length > 0) {
      console.log('Valid room ID:', rooms[0]._id.toString());
      console.log('Room name:', rooms[0].name);
      console.log('Room price:', rooms[0].pricePerNight);
    } else {
      console.log('No rooms found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

getValidRoomId();