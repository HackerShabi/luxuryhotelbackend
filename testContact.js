const http = require('http');

const data = JSON.stringify({
  name: 'Test User',
  email: 'test@example.com',
  phone: '15551234567',
  subject: 'Test Contact for Real-time Updates',
  message: 'This is a test contact message to verify real-time functionality is working properly',
  inquiryType: 'general'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/contacts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Contact created successfully:');
    console.log(JSON.parse(responseData));
  });
});

req.on('error', (error) => {
  console.error('Error creating contact:', error);
});

req.write(data);
req.end();