const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const { preprocessCustomerMassage } = require('./genai/orchestration');

/**
 * 
 * @After(event = { "CREATE" }, entity = "btpgenai4s4Srv.ReportMessage")
 * @param {(Object|Object[])} results - For the After phase only: the results of the event processing
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(results, request) {

	try {
		// Extract the message ID from the request data
		const messageId = request.data.ID;
		if (!messageId) {
			return request.reject(400, 'Message ID is missing.');
		}

		const mimeType = request.data.attachments[0].mimeType;
		if(!mimeType.startsWith('image/'))
			return request.error(400, 'Please submit images only');

		let customerMessage;
		try {
			// Fetch the message
			customerMessage = await SELECT.one('btpgenai4s4.CustomerMessage').where({ ID: messageId }).forUpdate();
		} catch (error) {
			const message = 'Failed to retrieve the customer message';
			LOG.error(`${message}`, error.message);
			return request.reject(500, `${message}`);
		}

		const {
			ID,
			titleEnglish,
			summaryEnglish,
			messageCategory,
			messageUrgency,
			messageSentiment,
			summaryCustomerLanguage,
			fullMessageEnglish,
			titleCustomerLanguage,
			fullMessageCustomerLanguage,
		} = customerMessage;

		if(!ID || !titleCustomerLanguage || !fullMessageCustomerLanguage){
			const message = 'Failed to retrieve important feilds from the customer message';
			LOG.error(`${message}`);
			return request.reject(500, `${message}`);
		}

		// Check if essential fields are present
		if (!titleEnglish || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !fullMessageEnglish) {
			let messageResultJSON;
			try {
				// Preprocess the customer message using an external service
				messageResultJSON = await preprocessCustomerMassage(titleCustomerLanguage, fullMessageCustomerLanguage);
			} catch (error) {
				const message = `Error from completion service for CustomerMessage ID ${ID}`;
				LOG.error(message, `${error.message}`);
				return request.reject(500, message);
			}

			const {
				fullMessageEnglish,
				titleEnglish,
				summaryCustomerLanguage,
				summaryEnglish,
				messageCategory,
				messageUrgency,
				messageSentiment
			} = messageResultJSON;

			// Validate the response from the preprocessing service
			if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
				const message = `Incomplete response from completion service for CustomerMessage ID ${ID}`;
				LOG.error(message, `${error.message}`);
				return request.reject(500, message);
			}

			try {
				// Update the customer message with preprocessed data
				await UPDATE('btpgenai4s4.CustomerMessage')
					.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
					.where({ ID });
				LOG.info(`CustomerMessage with ID ${ID} created and generated data inserted`);
			} catch (error) {
				const message = `Error updating CustomerMessage ID ${ID}`;
				LOG.error(`${message}`, `${error.message}`);
				return request.reject(500, message);
			}
		} else {
			LOG.info(`CustomerMessage ID ${ID} already processed`);
		}
	} catch (err) {
		// Log and handle unexpected errors
		LOG.error('An unexpected error occurred:', err.message || JSON.stringify(err));
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: err.message || 'An error occurred',
			target: 'ProcessMessage',
			status: err.code || 500,
		});
	}
}