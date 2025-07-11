export default function handler(req, res) {
  if (req.method === 'POST') {
    // Parse JSON body (Vercel does this automatically if content-type is application/json)
    console.log('Received metaBoost:', req.body);
    res.status(200).json({ status: 'ok', received: req.body });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 