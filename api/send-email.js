const https = require('https');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, topic, watch, phone, set, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isSell = topic === 'Sell or trade';
  const subject = isSell
    ? `Ur til salg fra allintime.dk`
    : `Forespørgsel fra allintime.dk`;

  const text = `
Navn: ${name}
Email: ${email}
Emne: ${topic}
Ur: ${watch || '-'}
${isSell ? `Telefon: ${phone || '-'}\nBoks og papirer: ${set || '-'}` : ''}

Besked:
${message}
  `.trim();

  const data = JSON.stringify({
    personalizations: [{ to: [{ email: 'antonbwehding@gmail.com' }] }],
    from: { email: 'anton@allintime.dk', name: 'All in Time' },
    reply_to: { email: email, name: name },
    subject: subject,
    content: [{ type: 'text/plain', value: text }]
  });

  const options = {
    hostname: 'api.sendgrid.com',
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res2) => {
      let body = '';
      res2.on('data', chunk => body += chunk);
      res2.on('end', () => {
        if (res2.statusCode >= 200 && res2.statusCode < 300) {
          res.status(200).json({ success: true });
        } else {
          console.error('SendGrid error:', res2.statusCode, body);
          res.status(500).json({ error: 'Failed to send email' });
        }
        resolve();
      });
    });
    req.on('error', err => {
      console.error('Request error:', err);
      res.status(500).json({ error: 'Server error' });
      resolve();
    });
    req.write(data);
    req.end();
  });
};
