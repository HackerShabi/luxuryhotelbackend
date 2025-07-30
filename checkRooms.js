const mongoose = require('mongoose')
const Room = require('./models/Room')
require('dotenv').config()

async function checkRooms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')
    
    const rooms = await Room.find({})
    console.log('Number of rooms found:', rooms.length)
    
    if (rooms.length > 0) {
      console.log('First room structure:')
      console.log(JSON.stringify(rooms[0], null, 2))
    } else {
      console.log('No rooms found in database')
    }
    
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error:', error)
  }
}

checkRooms()