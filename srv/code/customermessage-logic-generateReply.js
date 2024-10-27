const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { generateResponseTechMessage, generateResponseOtherMessage } = require('./genai/orchestration');
const { generateEmbedding } = require('./genai/embedding');

const SIMILARITY_THRESHOLD = 0.5;

/**
 * 
 * @On(event = { "Action1" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
	try {
		const { ID } = request.params[0] || {};
		if (!ID) {
			return request.reject(400, 'ID parameter is missing.');
		}
	
		const customerMessage = await SELECT.one.from('btpgenai4s4.CustomerMessages').where({ ID });
		if (!customerMessage) {
			throw new Error(`CustomerMessage with ID ${ID} not found.`);
		}
		
		const { fullMessageCustomerLanguage, messageCategory, messageSentiment, S4HC_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;
	
		let soContext = '';
		if (attachedSOId) {
			try {
				const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
				const { A_ServiceOrder } = s4HcpServiceOrderOdata.entities;
	
				const s4hcSO = await s4HcpServiceOrderOdata.run(
					SELECT.from(A_ServiceOrder, so => {
						so('ServiceOrder');
						so.to_Text(note => {
							note('LongText');
						});
					}).where({ ServiceOrder: attachedSOId })
				);
	
				if (s4hcSO && s4hcSO.length > 0) {
					const serviceOrder = s4hcSO[0];
					const notes = serviceOrder.to_Text || [];
					soContext = notes.map(note => note.LongText || '').join(' ');
				} else {
					LOG.warn(`No service order found for ID: ${attachedSOId}`);
					soContext = '';
				}
			} catch (error) {
				LOG.error('Error fetching service order details:', error.message);
				soContext = '';
			}
		} else {
			LOG.warn('No or Invalid attachedSOId provided.');
		}
	
		let resultJSON;
		if (messageCategory === 'Technical') {
			let fullMessageEmbedding;
			try {
				fullMessageEmbedding = await generateEmbedding(request, fullMessageCustomerLanguage);
			} catch (err) {
				LOG.error('Embedding service failed', err);
				return request.reject(500, 'Embedding service failed');
			}
	
			const relevantFAQs = await SELECT.from('yourname_3_a01.ProductFAQ')
				.columns('ID', 'issue', 'question', 'answer')
				.where`cosine_similarity(embedding, to_real_vector(${fullMessageEmbedding})) > ${SIMILARITY_THRESHOLD}`;
			
			const faqItem = (relevantFAQs && relevantFAQs.length > 0) ? relevantFAQs[0] : { issue: '', question: '', answer: '' };
			try {
				resultJSON = await generateResponseTechMessage(faqItem.issue, faqItem.question, faqItem.answer, fullMessageCustomerLanguage, soContext);
			} catch (err) {
				LOG.error('Completion service failed', err);
				return request.reject(500, 'Completion service failed');
			}
		} else {
			try {
				resultJSON = await generateResponseOtherMessage(messageSentiment, fullMessageCustomerLanguage, soContext);
			} catch (err) {
				LOG.error('Completion service failed', err);
				return request.reject(500, 'Completion service failed');
			}
		}
	
		const { suggestedResponseCustomerLanguage, suggestedResponseEnglish } = resultJSON;
		if (!suggestedResponseCustomerLanguage || !suggestedResponseEnglish) {
			return request.reject(500, 'Completion service failed. Generated responses are invalid');
		}
	
		await UPDATE('btpgenai4s4.CustomerMessages').set({
			suggestedResponseCustomerLanguage,
			suggestedResponseEnglish,
		}).where({ ID });
	
		LOG.info(`CustomerMessage with ID ${ID} updated with a reply to the customer.`);
	} catch (err) {
		LOG.error('An error occurred:', err.message);
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: err.message || 'An internal error occurred',
			target: 'GenerateReply',
			status: err.code || 500,
		});
	}
}