const mongoose = require('mongoose');
const Room = require('./models/Room');
require('dotenv').config();

async function debugRoom() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const roomId = '6889b5179378872b5a9ef2ed';
    console.log('Looking for room ID:', roomId);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(roomId));
    
    const room = await Room.findById(roomId);
    console.log('Room found:', !!room);
    if (room) {
      console.log('Room name:', room.name);
      console.log('Room isAvailable:', room.isAvailable);
    }
    
    // List all rooms
    const allRooms = await Room.find({});
    console.log('Total rooms in DB:', allRooms.length);
    allRooms.forEach(r => console.log(`- ${r._id}: ${r.name}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugRoom();