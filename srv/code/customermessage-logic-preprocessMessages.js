const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { preprocessCustomerMassage } = require('./genai/orchestration');

/**
 * message categorization, urgency classification, service categorization and summarization and translation
 * @Before(event = { "READ" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
	try {
		const customerMessages = await SELECT.from('btpgenai4s4.CustomerMessages').forUpdate();
	
		await Promise.all(customerMessages.map(async customerMessage => {
			const {
				ID,
				titleEnglish,
				summaryEnglish,
				messageCategory,
				messageUrgency,
				messageSentiment,
				titleCustomerLanguage,
				summaryCustomerLanguage,
				fullMessageCustomerLanguage,
				fullMessageEnglish
			} = customerMessage;
	
			if (!titleEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !summaryEnglish || !fullMessageEnglish) {	
				let resultJSON;
				try {
					resultJSON = await preprocessCustomerMassage(titleCustomerLanguage, fullMessageCustomerLanguage);
				} catch (error) {
					LOG.error(`Error from completion service for CustomerMessage ID ${ID}: ${error.message}`);
					return;  // Skip this message and proceed to the next
				}
	
				const {
					fullMessageEnglish,
					titleEnglish,
					summaryCustomerLanguage,
					summaryEnglish,
					messageCategory,
					messageUrgency,
					messageSentiment
				} = resultJSON;
	
				if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
					LOG.error(`Incomplete response from completion service for CustomerMessage ID ${ID}`);
					return;  // Skip this message and proceed to the next
				}
	
				try {
					await UPDATE('btpgenai4s4.CustomerMessages')
						.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
						.where({ ID });
					LOG.info(`CustomerMessage with ID ${ID} updated`);
				} catch (updateError) {
					LOG.error(`Error updating CustomerMessage ID ${ID}: ${updateError.message}`);
				}
			} else {
				LOG.info(`CustomerMessage ID ${ID} already processed`);
			}
		}));
	} catch (err) {
		LOG.error('An unexpected error occurred:', err.message || JSON.stringify(err));
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: err.message || 'An error occurred',
			target: 'ProcessCustomerMessages',
			status: err.code || 500,
		});
	}
}