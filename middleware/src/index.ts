import Fastify from 'fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Konfigurasi Redis menggunakan host dari docker-compose
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Inisialisasi antrian BullMQ
// Memastikan kita menggunakan Redis yang sama dengan Chatwoot
const notificationQueue = new Queue('NotificationQueue', { connection });

const fastify = Fastify({ logger: true });

// Endpoint webhook yang akan dipanggil oleh Chatwoot Automation Rules
fastify.post('/webhook', async (request, reply) => {
  const payload = request.body as any;
  
  // Validasi payload webhook Chatwoot
  if (!payload || !payload.event) {
    return reply.status(400).send({ error: 'Invalid payload' });
  }

  fastify.log.info(`Received webhook event: ${payload.event}`);

  // Menambahkan pekerjaan ke antrian
  await notificationQueue.add('processNotification', payload);

  return { success: true, message: 'Event queued for processing' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info('Middleware server is running on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
