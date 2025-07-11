const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Your metaBoost endpoint
app.post('/api/metaboost', (req, res) => {
  console.log('Received metaBoost:', req.body);
  // You can save to a database, file, or just respond
  res.json({ status: 'ok', received: req.body });
});

// Remove the root endpoint since we're serving static files

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 