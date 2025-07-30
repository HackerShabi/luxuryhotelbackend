const http = require('http');

const sampleRoom = {
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
};

const postData = JSON.stringify(sampleRoom);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/rooms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();