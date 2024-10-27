const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

async function generateEmbedding(request, content) {
    if (!content || typeof content !== 'string') {
        return request.reject(400, 'Invalid content provided for embedding generation.');
    }

    try {
        const { AzureOpenAiEmbeddingClient } = await import('@sap-ai-sdk/foundation-models');
        const client = new AzureOpenAiEmbeddingClient('text-embedding-3-small');
        
        const response = await client.run({ input: content });
        const embedding = response.getEmbedding();

        if (!Array.isArray(embedding) || embedding.length === 0) {
            return request.reject(500, 'Invalid embedding received from the service.');
        }

        return embedding;
    } catch (error) {
        LOG.error('Embedding service failed:', error);
        return request.reject(503, 'Embedding service is unavailable.');
    }
}

module.exports = { generateEmbedding };
