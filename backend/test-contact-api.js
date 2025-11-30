const axios = require('axios');

const testContactForm = async () => {
  try {
    const response = await axios.post('http://localhost:5000/api/contact', {
      name: 'Test User',
      email: 'en23172488@git-india.edu.in',
      message: 'This is a test message from the contact form API test.'
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

testContactForm();