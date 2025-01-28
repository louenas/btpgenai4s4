const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const {preprocessCustomerMessage } = require('./genai/orchestration');

/**
 * Message categorization, urgency classification, service categorization, summarization, and translation
 * @Before(event = { "READ" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - Contains user information, tenant-specific CDS model, headers, and query parameters
 */
module.exports = async function (request) {
	try {
		let customerMessages;
		try {
			// Fetch all customer messages from the database for processing
			customerMessages = await SELECT.from('btpgenai4s4.CustomerMessage').forUpdate();
		} catch (error) {
			LOG.error('Failed to retrieve customer messages', error.message);
			request.reject(500, 'Failed to retrieve customer messages');
		}

		// Process each customer message concurrently
		await Promise.all(customerMessages.map(async customerMessage => {
			const { ID, titleEnglish, summaryEnglish, messageCategory, messageUrgency, messageSentiment, titleCustomerLanguage, summaryCustomerLanguage,
				fullMessageCustomerLanguage, fullMessageEnglish } = customerMessage;

			// Skip processing if essential fields are already populated
			if (!titleEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !summaryEnglish || !fullMessageEnglish) {
				let resultJSON;
				try {
					// Call  GenAI Hub service to process the customer message
					resultJSON = await preprocessCustomerMessage(titleCustomerLanguage, fullMessageCustomerLanguage);
				} catch (error) {
					// Log errors from the external service and skip to the next message
					LOG.error(`Error from completion service for CustomerMessage ID ${ID}: ${error.message}`);
					return;
				}

				const { fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment } = resultJSON;

				// Ensure the response contains all required fields
				if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
					LOG.error(`Incomplete response from completion service for CustomerMessage ID ${ID}`);
					return;
				}

				try {
					// Update the database with the processed customer message details
					await UPDATE('btpgenai4s4.CustomerMessage')
						.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
						.where({ ID });
					LOG.info(`CustomerMessage with ID ${ID} updated`);
				} catch (error) {
					// Log errors during the database update and skip to the next message
					LOG.error(`Error updating CustomerMessage ID ${ID}: ${error.message}`);
					return;
				}
			} else {
				// Log that the message is already processed and skip further processing
				LOG.info(`CustomerMessage ID ${ID} already processed`);
			}
		}));

	} catch (error) {
		LOG.error('An unexpected error occurred:', error.message || JSON.stringify(error));
		return error;
	}
}
