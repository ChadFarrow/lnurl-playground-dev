const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || 'application/xml';
    res.set('Content-Type', contentType);
    const body = await response.text();
    res.send(body);
  } catch (e) {
    res.status(500).send('Failed to fetch: ' + e.message);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 