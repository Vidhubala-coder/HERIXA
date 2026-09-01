import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB connection disconnected.');
  });

  try {
    const isProduction = process.env.NODE_ENV === 'production';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: !isProduction,
    });
  } catch (error: any) {
    console.error(`Initial MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB connection closed cleanly.');
  } catch (error: any) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};
