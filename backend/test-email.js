const { sendContactEmail } = require('./lib/email');

// Test data
const testData = {
  name: 'Test User',
  email: 'en23172488@git-india.edu.in',
  message: 'This is a test message to verify email functionality.'
};

console.log('Testing email functionality...');

sendContactEmail(testData)
  .then(() => {
    console.log('Test email sent successfully!');
  })
  .catch((error) => {
    console.error('Failed to send test email:', error);
  });