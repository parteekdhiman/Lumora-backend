import dotenv from 'dotenv';
import Embedding from './embedding.model.js';

dotenv.config();

/**
 * Computes cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const embeddingService = {
  /**
   * Generates embeddings via OpenRouter or fallback provider.
   * Uses nomic-embed-text as default if the key is available.
   */
  async createEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for generating an embedding");
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY is missing. Using random fallback embedding.");
      // Fallback for development without API key
      return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }

    // Replace with a valid embedding model in OpenRouter, or default
    const model = process.env.EMBEDDING_MODEL || "nomic-ai/nomic-embed-text";

    try {
      const payload = {
        model: model,
        input: text
      };

      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Lumora"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenRouter Embeddings API error");
      }

      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error("Invalid embedding response structure");
      }

      return data.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation failed:", error.message || error);
      // Local fallback to prevent crashes during development if API limits reached
      return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }
  },

  /**
   * Upserts an embedding for a specific document.
   */
  async upsertEmbedding({ sourceType, sourceId, text, metadata = {} }) {
    if (!sourceType || !sourceId || !text) return;

    try {
      const embeddingVec = await this.createEmbedding(text);

      await Embedding.findOneAndUpdate(
        { sourceType, sourceId },
        {
          text,
          embedding: embeddingVec,
          metadata,
          isActive: true
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (error) {
      console.error(`Failed to upsert embedding for ${sourceType} ${sourceId}:`, error);
    }
  },

  /**
   * Deactivates an embedding when the source document is deleted/hidden.
   */
  async deactivateEmbedding(sourceType, sourceId) {
    try {
      await Embedding.findOneAndUpdate(
        { sourceType, sourceId },
        { isActive: false }
      );
    } catch (error) {
      console.error(`Failed to deactivate embedding for ${sourceType} ${sourceId}:`, error);
    }
  },

  /**
   * Performs vector search against active embeddings.
   * Falls back to JS cosine similarity if $vectorSearch is unsupported.
   */
  async vectorSearch({ queryText, sourceTypes = [], limit = 5, filters = {} }) {
    try {
      const queryEmbedding = await this.createEmbedding(queryText);

      const matchQuery = { isActive: true, ...filters };
      if (sourceTypes.length > 0) {
        matchQuery.sourceType = { $in: sourceTypes };
      }

      // Try MongoDB Atlas $vectorSearch (requires Atlas and specific index setup)
      // Since we don't know if the user is using Atlas, we wrap this in try-catch
      try {
        // If the collection is empty, this will just return []
        const docs = await Embedding.aggregate([
          {
            $vectorSearch: {
              index: "vector_index", // The name of the Atlas search index
              path: "embedding",
              queryVector: queryEmbedding,
              numCandidates: 100,
              limit: limit,
              filter: matchQuery
            }
          },
          {
            $project: {
              _id: 1,
              sourceType: 1,
              sourceId: 1,
              text: 1,
              metadata: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]);
        if (docs && docs.length > 0) return docs;
      } catch (atlasError) {
        // Atlas vector search likely not available or configured.
        // Fallback to JS cosine similarity calculation
      }

      // Fallback: JS cosine similarity (safe for development)
      const allActiveDocs = await Embedding.find(matchQuery).lean();

      if (allActiveDocs.length === 0) return [];

      const scoredDocs = allActiveDocs.map(doc => ({
        ...doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      scoredDocs.sort((a, b) => b.score - a.score);

      return scoredDocs.slice(0, limit);
    } catch (error) {
      console.error("Vector search failed:", error);
      return [];
    }
  }
};
