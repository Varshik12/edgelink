import mongoose from 'mongoose';

let mongoConnected = false;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] MONGODB_URI not set; using local JSON store fallback (data/edgelink-seo.db.json).');
    mongoConnected = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnected = true;
    console.log('[Database] Connected to MongoDB via Mongoose.');
    return true;
  } catch (err) {
    console.warn(
      '[Database] MongoDB connection failed; falling back to local JSON store:',
      err instanceof Error ? err.message : err
    );
    mongoConnected = false;
    return false;
  }
}

export function isMongoConnected() {
  return mongoConnected && mongoose.connection.readyState === 1;
}
