import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Konfigurasi Redis
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

console.log('Worker is starting up and connecting to Redis...');

// Worker untuk memproses antrian notifikasi
const worker = new Worker(
  'NotificationQueue',
  async (job: Job) => {
    const payload = job.data;
    
    console.log(`Processing job ${job.id} for event ${payload.event}`);

    // LOGIKA KUSTOM:
    // Di sini kita bisa menambahkan logika notifikasi kustom 
    // berdasarkan isi percakapan, inbox_id (per akun), dsb.
    // Chatwoot mendefinisikan label (GROUP) untuk grup.
    
    if (payload.event === 'message_created') {
      const isGroup = payload.conversation?.meta?.sender?.name?.includes('(GROUP)');
      const content = payload.content;
      const inboxId = payload.inbox?.id;
      
      console.log(`Message in inbox ${inboxId}: "${content}" - isGroup: ${isGroup}`);
      
      // Contoh: Panggil API eksternal untuk push notification kustom
      // await sendCustomNotification(payload);
    }
    
    return { status: 'completed' };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
