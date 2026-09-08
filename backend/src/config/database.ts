import mongoose from 'mongoose';

let listenersAttached = false;

export const connectDatabase = async (retries = 5, delayMs = 3000): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';

  if (!listenersAttached) {
    listenersAttached = true;
    mongoose.connection.on('connected', () => {
      console.log('[HERIXA-DATABASE] MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[HERIXA-DATABASE] MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[HERIXA-DATABASE] MongoDB connection disconnected. Mongoose will attempt automatic reconnection.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[HERIXA-DATABASE] MongoDB reconnected successfully.');
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: !isProduction,
      });
      console.log('[HERIXA-DATABASE] MongoDB Atlas connected.');
      return;
    } catch (error: any) {
      console.error(`[HERIXA-DATABASE] Initial MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (error.message && (error.message.includes('Could not connect to any servers') || error.message.includes('selection timed out'))) {
        console.error('[MONGODB-ATLAS-DIAGNOSTIC] Network Access IP Blocked or Atlas unreachable: Please verify outbound network access and MongoDB Atlas Network Access IP allowlist.');
      }
      if (attempt < retries) {
        console.log(`[HERIXA-DATABASE] Retrying MongoDB connection in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('[HERIXA-DATABASE] All initial MongoDB connection attempts exhausted. Backend running in degraded state.');
      }
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[HERIXA-DATABASE] MongoDB connection closed cleanly.');
  } catch (error: any) {
    console.error(`[HERIXA-DATABASE] Error closing MongoDB connection: ${error.message}`);
  }
};

