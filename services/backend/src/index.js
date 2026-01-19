const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/orders', (req, res) => {
  // minimal placeholder: echo body with fake id
  const id = require('crypto').randomUUID();
  res.status(201).json(Object.assign({ id }, req.body));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('backend listening on', port));
