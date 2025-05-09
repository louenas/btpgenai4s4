const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const { analyseImage } = require('./genai/orchestration');
const { getBase64Content } = require('./genai/utils');

/**
 * @After(event = { "READ" }, entity = "btpgenai4s4Srv.ReportMessage")
 * @param {(Object|Object[])} results - Results of the event processing
 * @param {Object} request - Request containing user info, tenant-specific CDS model, headers, and query parameters
 */
module.exports = async function (results, request) {
	// Extract the message ID from the first result
	const messageId = results?.[0]?.ID;
	if (!messageId) {
		request.reject(400, 'Message ID is missing.');
	}

	let customerMessage;

	try {
		// Fetch customer message record by ID
		customerMessage = await SELECT.one('btpgenai4s4.CustomerMessage').where({ ID: messageId }).forUpdate();
	} catch (error) {
		const message = 'Failed to retrieve the customer message';
		LOG.error(message, error.message);
		request.reject(500, message);
	}

	// Destructure necessary fields from the fetched message
	const { ID, fullMessageEnglish, titleCustomerLanguage, fullMessageCustomerLanguage, imageLLMDescription } = customerMessage || {};

	// Validate essential fields
	if (!ID || !titleCustomerLanguage || !fullMessageCustomerLanguage) {
		const message = 'Missing required fields in the customer message';
		LOG.error(message);
		request.warn(message);
		return;
	}

	// Proceed only if the image description is missing
	if (!imageLLMDescription) {

		let contentStream;
		try {
			// Retrieve the latest attachment for the customer message
			const [latestAttachment] = await cds.run(
				SELECT.from('btpgenai4s4.CustomerMessage:attachments').where({ up__ID: messageId })
					//SELECT.from('btpgenai4s4.CustomerMessage:attachments')
					.orderBy('createdAt desc')
					.limit(1)
			);
			// Fetch the attachment content and convert it to Base64
			const attachID = latestAttachment.ID;
			const AttachmentsSrv = await cds.connect.to("attachments");
			contentStream = await AttachmentsSrv.get('btpgenai4s4.CustomerMessage:attachments', attachID);
		} catch (error) {
			const message = 'Either there is no attachment or the processing of it failed!';
			LOG.error(message);
			request.warn(message);
			return;
		}

		let base64Image;
		let imageInterpResultJSON;
		try {
			// Convert the content stream to a Base64-encoded string
			base64Image = await getBase64Content(contentStream);
			imageInterpResultJSON = await analyseImage(base64Image, fullMessageEnglish);
		} catch (error) {
			const message = `Error when trying to process the image and generate the image description for message ${ID}`;
			LOG.error(message, error.message);
			request.warn(message);
			return;
		}

		// Analyze the Base64 image and retrieve description data
		let { imageAboutFreezers, imageMatchingUserDescription, imageLLMDescription } = imageInterpResultJSON;

		// Update the message if the image is valid and matches the description
		try {
			await UPDATE('btpgenai4s4.CustomerMessage')
				.set({ imageAboutFreezers, imageMatchingUserDescription, imageLLMDescription })
				.where({ ID });
			const message = `CustomerMessage with ID ${ID} created and generated data inserted`;
			LOG.info(message);
		} catch (error) {
			const message = `Error updating CustomerMessage ID ${ID}`;
			LOG.error(message, error.message);
			request.warn(message);
			return;
		}

		if (imageAboutFreezers === "yes" && imageMatchingUserDescription === "yes") {
			// Reject if the image does not match expectations
			const message = "The image sent is about freezers and matching the issue description";
			LOG.error(message);
			request.info(message);
			return;
		} else {
			// Reject if the image does not match expectations
			const message = "The image sent is either not about freezers or not matching the issue description";
			LOG.error(message);
			request.warn(message);
			return;
		}
	} else {
		// Log if the image has already been processed
		LOG.info(`Issue image for CustomerMessage ID ${ID} already processed`);
	}

}
