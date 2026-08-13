const https = require('https');

const key = 'AQ.Ab8RN6L9QhiH-ivQadrG1_AsZqmpsFaNTirGqNJHuTzy-nAG9w';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response:", data);
  });
}).on('error', (e) => {
  console.error("Error:", e);
});
