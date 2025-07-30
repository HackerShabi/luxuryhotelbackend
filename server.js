const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
    methods: ['GET', 'POST']
  }
})
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// CORS configuration
const allowedOrigins = [
  'https://luxuryhotel.vercel.app',
  'https://luxuryhotels.vercel.app',
  'https://luxuryhotelfrontend.vercel.app',
  'http://localhost:3000', // for local development
  process.env.FRONTEND_URL // from environment variable
].filter(Boolean) // remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-admin-key'],
  optionsSuccessStatus: 200
}))

// Additional CORS headers for credentials
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-admin-key')
  next()
})

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-reservation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err))

// Routes
app.use('/api/rooms', require('./routes/rooms'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/contacts', require('./routes/contacts'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/auth', require('./routes/auth'))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hotel Reservation API is running',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 Admin connected:', socket.id)
  
  socket.on('join-admin', () => {
    socket.join('admin-room')
    console.log('🔐 Admin joined admin room')
  })
  
  socket.on('disconnect', () => {
    console.log('👤 Admin disconnected:', socket.id)
  })
})

// Make io available globally
app.set('io', io)

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('🔌 Socket.IO enabled for real-time updates')
})