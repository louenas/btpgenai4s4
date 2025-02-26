const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const { preprocessCustomerMessage } = require('./genai/orchestration');

/**
 * @After(event = { "CREATE" }, entity = "btpgenai4s4Srv.ReportMessage")
 * @param {(Object|Object[])} results - Results of the event processing
 * @param {Object} request - Request containing user info, tenant-specific CDS model, headers, and query parameters
 */
module.exports = async function (results, request) {
    // Extract message ID from the request and validate it
    const messageId = request.data.ID;
    if (!messageId) {
        request.reject(400, 'Message ID is missing.');
    }

    // Fetch the customer message record for the given message ID
    let customerMessage;
    try {
        customerMessage = await SELECT.one('btpgenai4s4.CustomerMessage').where({ ID: messageId }).forUpdate();
    } catch (error) {
        const message = 'Failed to retrieve the customer message';
        LOG.error(message, error.message);
        request.reject(500, message);
    }

    // Destructure necessary fields from the fetched customer message
    const { ID, titleEnglish, summaryEnglish, messageCategory, messageUrgency, messageSentiment, summaryCustomerLanguage, fullMessageEnglish,
        titleCustomerLanguage, fullMessageCustomerLanguage, } = customerMessage || {};

    // Ensure critical fields exist in the retrieved customer message
    if (!ID || !titleCustomerLanguage || !fullMessageCustomerLanguage) {
        const message = 'Missing critical fields in the customer message';
        LOG.error(message);
        request.warn(message);
        return;
    }

    // Process the message if any required field is missing
    if (!titleEnglish || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !fullMessageEnglish) {
        let messageResultJSON;
        try {
            // Call the preprocessing service for message enrichment
            messageResultJSON = await preprocessCustomerMessage(titleCustomerLanguage, fullMessageCustomerLanguage);
        } catch (error) {
            const message = `Error from completion service for CustomerMessage ID ${ID}`;
            LOG.error(message, error.message);
            request.warn(message);
            return;
        }

        // Validate the response from the preprocessing service
        const { fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment } = messageResultJSON || {};
        if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
            const message = `Incomplete response from completion service for CustomerMessage ID ${ID}`;
            LOG.error(message);
            request.warn(message);
            return;
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
            request.warn(message);
            return;
        }
    } else {
        // Log if the message is already processed
        LOG.info(`CustomerMessage ID ${ID} already processed.`);
    }
}
