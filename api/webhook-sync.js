// Vercel serverless function for webhook processing
import webhookSync from '../thesplitbox/server/routes/splitbox/routes/webhookSync.js';
import { InMemoryStore } from '../thesplitbox/server/stores/inMemoryStore.js';

// Initialize store
const storeMetadata = new InMemoryStore();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Create webhook handler
    const webhookHandler = webhookSync(storeMetadata);
    
    // Execute webhook handler
    await webhookHandler(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}