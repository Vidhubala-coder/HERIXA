import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { verifySmtpConnection } from './services/emailService';
import { runAdminMigration } from './utils/migration';
import { checkAiServiceHealth } from './services/aiService';

const PORT = parseInt(process.env.PORT || '5000');
const HOST = '0.0.0.0'; // Accept connections on any local IP address for physical Android debugging

const startServer = async () => {
  // Connect to MongoDB
  await connectDatabase();

  // Run admin account role normalization migration
  await runAdminMigration();

  // Verify SMTP Connection
  await verifySmtpConnection();

  // Check AI recognition service health
  await checkAiServiceHealth();

  const server = app.listen(PORT, HOST, () => {
    console.log(`HERIXA Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Local Access: http://localhost:${PORT}`);
    console.log(`Network Access: http://0.0.0.0:${PORT} (binds all network interfaces)`);
  });

  // Handle termination signals for graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
