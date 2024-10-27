const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const utils = require('./genai/utils');
const { generateEmbedding } = require('./genai/embedding');

/**
 * 
 * @After(event = { "CREATE","UPDATE" }, entity = "btpgenai4s4Srv.ProductFAQ")
 * @param {(Object|Object[])} results - For the After phase only: the results of the event processing
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(results, request) {
	try {
		// Extract the ProductFAQ ID from the request data
		const productFAQID = request.data.ID;
		if (!productFAQID) {
			return request.reject(400, 'ProductFAQ ID is missing.');
		}
	
		// Fetch the specific ProductFAQ entry for update
		const productFAQ = await SELECT.one('btpgenai4s4.ProductFAQ').where({ ID: productFAQID }).forUpdate();
		if (!productFAQ) {
			return request.reject(404, `ProductFAQ with ID ${productFAQID} not found.`);
		}
	
		const {
			ID,
			issue,
			question,
			answer
		} = productFAQ;
	
		// Embed the concatenated issue, question, and answer text
		let embedding;
		try {
			// Use getEmbedding to access the embedding vector
			embedding = await generateEmbedding(request, `${issue} ${question} ${answer}`)
			LOG.info("embedding", embedding);
		} catch (error) {
			LOG.error('Embedding service failed:', error.message);
			return request.reject(500, 'Embedding service failed.');
		}
	
		// Update the ProductFAQ entry with the new embedding
		await UPDATE('btpgenai4s4.ProductFAQ').set({ embedding: utils.array2VectorBuffer(embedding) }).where({ ID });
	
		LOG.info(`ProductFAQ with ID ${ID} updated with new embedding.`);
	
	} catch (err) {
		// Log the error and send a response
		LOG.error('An error occurred:', err.message);
	
		// Extract the root cause message if available
		const message = err.rootCause?.message || err.message || 'An unexpected error occurred';
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: message,
			target: 'EmbedFAQs',
			status: err.code || 500,
		});
	}
}