// Main API handler for all routes
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.url === '/api' || req.url === '/api/') {
    res.status(200).json({ 
      status: 'ok', 
      message: 'V4V Lightning Payment Tester API',
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(404).json({ error: 'Not found' });
}