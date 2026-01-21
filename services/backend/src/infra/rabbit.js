const amqplib = require('amqplib');

let conn;

async function getConnection() {
  const url = process.env.RABBITMQ_URL;
  if (!url) return null;
  if (!conn) conn = await amqplib.connect(url);
  return conn;
}

async function rabbitPing() {
  if (!process.env.RABBITMQ_URL) return { enabled: false };
  try {
    const c = await getConnection();
    const ch = await c.createChannel();
    await ch.close();
    return { enabled: true, ok: true };
  } catch (err) {
    return { enabled: true, ok: false, error: err.message };
  }
}

async function publish(queue, payload) {
  const c = await getConnection();
  if (!c) return;
  const ch = await c.createChannel();
  await ch.assertQueue(queue, { durable: true });
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
  await ch.close();
}

module.exports = { rabbitPing, publish };
