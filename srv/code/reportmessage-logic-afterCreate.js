const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const { preprocessCustomerMassage } = require('./genai/orchestration');

module.exports = async function (results, request) {
    try {
        // Extract message ID from the request and validate it
        const messageId = request.data.ID;
        if (!messageId) {
            request.reject({ code: 400, message: 'Message ID is missing.', target: 'ReportMessage' });
        }

        // Check if the attached file is an image
        const mimeType = request.data.attachments[0]?.mimeType;
        if (!mimeType?.startsWith('image/')) {
            request.reject({ code: 400, message: 'Please submit images only.', target: 'ReportMessage' });
        }

        // Fetch the customer message record for the given message ID
        let customerMessage;
        try {
            customerMessage = await SELECT.one('btpgenai4s4.CustomerMessage').where({ ID: messageId }).forUpdate();
        } catch (error) {
            const message = 'Failed to retrieve the customer message';
            LOG.error(message, error.message);
            request.reject({ code: 500, message: message, target: 'ReportMessage' });
        }

        // Destructure necessary fields from the fetched customer message
        const { ID, titleEnglish, summaryEnglish, messageCategory, messageUrgency, messageSentiment, summaryCustomerLanguage, fullMessageEnglish,
            titleCustomerLanguage, fullMessageCustomerLanguage, } = customerMessage || {};

        // Ensure critical fields exist in the retrieved customer message
        if (!ID || !titleCustomerLanguage || !fullMessageCustomerLanguage) {
            const message = 'Missing critical fields in the customer message';
            LOG.error(message);
            request.reject({ code: 500, message: message, target: 'ReportMessage' });
        }

        // Process the message if any required field is missing
        if (!titleEnglish || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !fullMessageEnglish) {
            let messageResultJSON;
            try {
                // Call the preprocessing service for message enrichment
                messageResultJSON = await preprocessCustomerMassage(titleCustomerLanguage, fullMessageCustomerLanguage);
            } catch (error) {
                const message = `Error from completion service for CustomerMessage ID ${ID}`;
                LOG.error(message, error.message);
                request.reject({ code: 500, message: message, target: 'ReportMessage' });
            }

            // Validate the response from the preprocessing service
            const { fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment } = messageResultJSON || {};
            if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
                const message = `Incomplete response from completion service for CustomerMessage ID ${ID}`;
                LOG.error(message);
                request.reject({ code: 500, message: message, target: 'ReportMessage' });
            }

            // Update the database record with the enriched data
            try {
                await UPDATE('btpgenai4s4.CustomerMessage')
                    .set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
                    .where({ ID });
                LOG.info(`CustomerMessage with ID ${ID} updated with generated data.`);
            } catch (error) {
                const message = `Error updating CustomerMessage ID ${ID}`;
                LOG.error(message, error.message);
                request.reject({ code: 500, message: message, target: 'ReportMessage' });
            }
        } else {
            // Log if the message is already processed
            LOG.info(`CustomerMessage ID ${ID} already processed.`);
        }
    } catch (error) {
        LOG.error('Unexpected error occurred:', error.message || JSON.stringify(error));
        return error;
    }
}
