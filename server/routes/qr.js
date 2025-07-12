import QRCode from "qrcode";

export default async function qrHandler(req, res) {
  try {
    const { text } = req.query;
    
    if (!text) {
      return res.status(400).json({ error: "Text parameter required" });
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrBuffer.length);
    res.send(qrBuffer);

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}