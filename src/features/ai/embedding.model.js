import mongoose from 'mongoose';

const embeddingSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    enum: ['job', 'resume', 'platform_doc', 'user_profile'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Create an index for vector search if Atlas is used
// Note: Actual Atlas Search index creation requires configuring the cluster.
export default mongoose.model('Embedding', embeddingSchema);
