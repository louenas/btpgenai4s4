const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { preprocessCustomerMassage } = require('./genai/orchestration');

/**
 * 
 * @Before(event = { "READ" }, entity = "yourName_Number_StudentIDSrv.CustomerMessage")
 * @param {cds.Request} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	let customerMessages;
	try {
		// Fetch all customer messages for processing
		customerMessages = await SELECT.from('YourName_Number_StudentID.CustomerMessage').forUpdate();
	} catch (error) {
		LOG.error('Failed to retrive customer messages', error.message);
		return request.reject(500, 'Failed to retrive customer messages');
	}

	// Process each customer message concurrently using Promise.all
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

		// Check if essential fields are present
		if (!titleEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !summaryEnglish || !fullMessageEnglish) {
			let resultJSON;
			try {
				// Preprocess the customer message using an external service
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

			// Validate the response from the preprocessing service
			if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
				LOG.error(`Incomplete response from completion service for CustomerMessage ID ${ID}`);
				return;  // Skip this message and proceed to the next
			}

			try {
				// Update the customer message with preprocessed data
				await UPDATE('YourName_Number_StudentID.CustomerMessage')
					.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
					.where({ ID });
				LOG.info(`CustomerMessage with ID ${ID} updated`);
			} catch (updateError) {
				LOG.error(`Error updating CustomerMessage ID ${ID}: ${updateError.message}`);
				return;  // Skip this message and proceed to the next
			}
		} else {
			LOG.info(`CustomerMessage ID ${ID} already processed`);
		}
	}));

}