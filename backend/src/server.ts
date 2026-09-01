import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { verifySmtpConnection } from './services/emailService';
import { runAdminMigration } from './utils/migration';
import { checkAiServiceHealthOnStartup } from './services/aiService';

const PORT = parseInt(process.env.PORT || '5000');
const HOST = '0.0.0.0'; // Accept connections on any local IP address for physical Android debugging

const startServer = async () => {
  // Connect to MongoDB
  await connectDatabase();

  // Run admin account role normalization migration
  await runAdminMigration();

  // Verify SMTP Connection
  await verifySmtpConnection();

  // Check AI recognition service health in the background (non-blocking with startup retries)
  checkAiServiceHealthOnStartup().catch((err) => {
    console.error('[HERIXA-AI] Startup health check failed:', err.message || err);
  });

  let retryCount = 0;
  const MAX_RETRIES = 10;

  const startListening = () => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`HERIXA Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`Local Access: http://localhost:${PORT}`);
      console.log(`Network Access: http://0.0.0.0:${PORT} (binds all network interfaces)`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`[HERIXA-BACKEND] Port ${PORT} is temporarily busy (attempt ${retryCount}/${MAX_RETRIES}). Retrying in 300ms...`);
          setTimeout(() => {
            try {
              server.close();
            } catch (e) {}
            startListening();
          }, 300);
        } else {
          console.error(`[HERIXA-BACKEND] Port ${PORT} is permanently occupied. Startup failed.`);
          process.exit(1);
        }
      } else {
        console.error('[HERIXA-BACKEND] Server error:', err);
      }
    });

    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  };
  
  startListening();
};

startServer();
// Dev restart validation comment
