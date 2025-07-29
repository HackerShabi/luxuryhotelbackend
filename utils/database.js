const mongoose = require('mongoose')
const colors = require('colors')

// Database connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`Database connection error: ${err}`.red.bold)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected'.yellow.bold)
    })

    mongoose.connection.on('reconnected', () => {
      console.log('Database reconnected'.green.bold)
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close()
        console.log('Database connection closed through app termination'.yellow.bold)
        process.exit(0)
      } catch (error) {
        console.error('Error during database disconnection:', error)
        process.exit(1)
      }
    })

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.bold)
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('Retrying database connection...'.yellow.bold)
      connectDB()
    }, 5000)
  }
}

// Database health check
const checkDBHealth = () => {
  const state = mongoose.connection.readyState
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }
  
  return {
    status: states[state],
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    collections: Object.keys(mongoose.connection.collections).length
  }
}

// Database statistics
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats()
    return {
      database: mongoose.connection.name,
      collections: stats.collections,
      documents: stats.objects,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`
    }
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error.message}`)
  }
}

// Clean up old data (utility function)
const cleanupOldData = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    
    // Clean up old contacts (older than 6 months and resolved)
    const Contact = require('../models/Contact')
    const oldContacts = await Contact.deleteMany({
      createdAt: { $lt: sixMonthsAgo },
      status: 'resolved'
    })
    
    // Clean up old bookings (older than 1 year and completed)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const Booking = require('../models/Booking')
    const oldBookings = await Booking.deleteMany({
      createdAt: { $lt: oneYearAgo },
      bookingStatus: 'completed'
    })
    
    console.log(`Cleanup completed: ${oldContacts.deletedCount} contacts, ${oldBookings.deletedCount} bookings removed`.green)
    
    return {
      contactsRemoved: oldContacts.deletedCount,
      bookingsRemoved: oldBookings.deletedCount
    }
  } catch (error) {
    console.error(`Cleanup failed: ${error.message}`.red)
    throw error
  }
}

// Create database indexes for better performance
const createIndexes = async () => {
  try {
    const Room = require('../models/Room')
    const Booking = require('../models/Booking')
    const Contact = require('../models/Contact')
    const User = require('../models/User')
    
    // Room indexes
    await Room.collection.createIndex({ type: 1, isActive: 1 })
    await Room.collection.createIndex({ 'pricing.basePrice': 1 })
    await Room.collection.createIndex({ 'rating.average': -1 })
    
    // Booking indexes
    await Booking.collection.createIndex({ checkInDate: 1, checkOutDate: 1 })
    await Booking.collection.createIndex({ 'guestInfo.email': 1 })
    await Booking.collection.createIndex({ bookingStatus: 1, createdAt: -1 })
    
    // Contact indexes
    await Contact.collection.createIndex({ status: 1, createdAt: -1 })
    await Contact.collection.createIndex({ email: 1 })
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ role: 1, isActive: 1 })
    
    console.log('Database indexes created successfully'.green)
  } catch (error) {
    console.error(`Index creation failed: ${error.message}`.red)
  }
}

// Backup database (basic implementation)
const backupDatabase = async () => {
  try {
    const { spawn } = require('child_process')
    const path = require('path')
    const fs = require('fs')
    
    const backupDir = path.join(__dirname, '../backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `backup-${timestamp}`)
    
    return new Promise((resolve, reject) => {
      const mongodump = spawn('mongodump', [
        '--uri', process.env.MONGODB_URI,
        '--out', backupPath
      ])
      
      mongodump.on('close', (code) => {
        if (code === 0) {
          console.log(`Database backup created: ${backupPath}`.green)
          resolve(backupPath)
        } else {
          reject(new Error(`Backup failed with code ${code}`))
        }
      })
      
      mongodump.on('error', (error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error(`Backup failed: ${error.message}`.red)
    throw error
  }
}

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats,
  cleanupOldData,
  createIndexes,
  backupDatabase
}