const http = require('http');

const bookingData = {
  room: '6889bfab62650fd4a43aa8d3',
  checkInDate: '2025-07-31',
  checkOutDate: '2025-08-02',
  numberOfGuests: 2,
  guestInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+12345678901',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10001'
    }
  },
  paymentInfo: {
    method: 'credit_card',
    paymentMethod: 'credit_card'
  }
};

const postData = JSON.stringify(bookingData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/bookings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', data);
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('✅ Booking created successfully!');
        console.log('Booking ID:', response.data.bookingId);
        console.log('Confirmation Number:', response.data.confirmationNumber);
      } else {
        console.log('❌ Booking failed:', response.message);
        if (response.errors) {
          response.errors.forEach(error => {
            console.log(`  - ${error.field}: ${error.message}`);
          });
        }
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();