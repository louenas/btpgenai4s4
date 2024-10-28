const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

// Function to generate an embedding using Azure OpenAI services
async function generateEmbedding(request, content) {
    // Validate input content
    if (!content || typeof content !== 'string') {
        return request.reject(400, 'Invalid content provided for embedding generation.');
    }

    try {
        // Import the AzureOpenAiEmbeddingClient from SAP AI SDK
        const { AzureOpenAiEmbeddingClient } = await import('@sap-ai-sdk/foundation-models');
        const client = new AzureOpenAiEmbeddingClient('text-embedding-3-small');
        
        // Generate embedding for the input content
        const response = await client.run({ input: content });
        const embedding = response.getEmbedding();

        // Validate the received embedding
        if (!Array.isArray(embedding) || embedding.length === 0) {
            return request.reject(500, 'Invalid embedding received from the service.');
        }

        return embedding;
    } catch (error) {
        // Log and handle any errors from the embedding service
        LOG.error('Embedding service failed:', error);
        return request.reject(503, 'Embedding service is unavailable.');
    }
}

module.exports = { generateEmbedding };