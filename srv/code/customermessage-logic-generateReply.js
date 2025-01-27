const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { generateResponseTechMessage, generateResponseOtherMessage } = require('./genai/orchestration');
const { generateEmbedding } = require('./genai/embedding');

const SIMILARITY_THRESHOLD = 0.45;

/**
 * 
 * @On(event = { "Action1" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	try {
		const { ID } = request.params[0] || {};
		// Check if the ID parameter is provided
		if (!ID) {
			request.reject(400, 'ID parameter is missing.');
		}

		let customerMessage;
		try {
			// Retrieve the CustomerMessage record based on the provided ID
			customerMessage = await SELECT.one.from('btpgenai4s4.CustomerMessage').where({ ID });
			if (!customerMessage) {
				throw new Error(`CustomerMessage with ID ${ID} not found.`);
			}
		} catch (error) {
			LOG.error('Failed to retrieve customer message', error.message);
			request.reject({ code: 500, message: `Failed to retrieve customer message with ID ${ID}`, target: 'CustomerMessages' });
		}

		const { messageCategory, messageSentiment, fullMessageEnglish, imageAboutFreezers, imageMatchingUserDescription, imageLLMDescription, S4HCP_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;

		// Use Sales order data as part of the context of the response if available
		let soContext = '';
		if (attachedSOId) {
			try {
				// Connect to the S4HCP Service Order OData service
				const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
				const { A_ServiceOrder } = s4HcpServiceOrderOdata.entities;

				// Fetch service order details, including long text notes
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
		let customerInputContext;
		// Use the issue's image as part of the context of the response if available
		if (imageAboutFreezers === "yes" && imageMatchingUserDescription === "yes")
			customerInputContext = fullMessageEnglish + " " + imageLLMDescription;
		else
			customerInputContext = fullMessageEnglish;

		// Generate a reply depending on wheter the customer message is technical or not
		if (messageCategory === 'Technical') {
			try {
				// Generate embedding for the technical message
				customerInputContextEmbedding = await generateEmbedding(request, customerInputContext);
			} catch (error) {
				LOG.error('Embedding service failed', error);
				request.reject({ code: 500, message: "Completion service failed", target: 'CustomerMessages' });
			}

			let relevantFAQs;
			try {
				// Retrieve relevant FAQ items based on the similarity with the generated embedding
				relevantFAQs = await SELECT.from('btpgenai4s4.ProductFAQ')
					.columns('ID', 'issue', 'question', 'answer')
					.where`cosine_similarity(embedding, to_real_vector(${customerInputContextEmbedding})) > ${SIMILARITY_THRESHOLD}`;
			} catch (error) {
				LOG.error('Failed to retrieve FAQ items', error.message);
				//return request.reject(500, 'Failed to retrieve FAQ items');
			}

			const faqItem = (relevantFAQs && relevantFAQs.length > 0) ? relevantFAQs[0] : { issue: '', question: '', answer: '' };
			try {
				// Generate a response for the technical message using the FAQ item and service order context
				resultJSON = await generateResponseTechMessage(faqItem.issue, faqItem.question, faqItem.answer, customerInputContext, soContext);
			} catch (error) {
				LOG.error('Completion service failed', error);
				request.reject({ code: 500, message: "Completion service failed", target: 'CustomerMessages' });
			}
		} else {
			try {
				// Generate response for non-technical messages, including service order context
				resultJSON = await generateResponseOtherMessage(messageSentiment, customerInputContext, soContext);
			} catch (error) {
				LOG.error('Completion service failed', error);
				request.reject({ code: 500, message: "Completion service failed", target: 'CustomerMessages' });
			}
		}

		const { suggestedResponseCustomerLanguage, suggestedResponseEnglish } = resultJSON;
		// Ensure the generated responses are valid before updating the record
		if (!suggestedResponseCustomerLanguage || !suggestedResponseEnglish) {
			request.reject(500, 'Completion service failed. Generated responses are invalid');
		}

		try {
			// Update the CustomerMessage with the generated responses
			await UPDATE('btpgenai4s4.CustomerMessage').set({
				suggestedResponseCustomerLanguage,
				suggestedResponseEnglish,
			}).where({ ID });
			LOG.info(`CustomerMessage with ID ${ID} updated with a reply to the customer.`);
		} catch (error) {
			LOG.error('Failed to update customer message', error.message);
			request.reject({ code: 500, message: `Failed to update customer message with ID ${ID}`, target: 'CustomerMessages' });
		}
	} catch (error) {
		LOG.error('An error occurred:', error.message);
		return error;
	}
}