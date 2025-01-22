const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const { analyseImage } = require('./genai/orchestration');

/**
 * 
 * @param {*} contentStream  Base64-encoded image
 * @returns 
 */
async function getBase64Content(contentStream) {
	return await new Promise((resolve, reject) => {
		const chunks = [];

		contentStream.on('data', (chunk) => {
			chunks.push(chunk);
		});

		contentStream.on('end', () => {
			const buffer = Buffer.concat(chunks);
			const base64String = buffer.toString('base64');
			resolve(base64String);
		});

		contentStream.on('error', (err) => {
			reject(err);
		});
	});
}

/**
 * 
 * @After(event = { "READ" }, entity = "btpgenai4s4Srv.ReportMessage")
 * @param {(Object|Object[])} results - For the After phase only: the results of the event processing
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(results, request) {
	try {
		// Extract the message ID from the request data
		const messageId = results[0].ID
		if (!messageId) {
			request.reject(400, 'Message ID is missing.');
		}
		
		let customerMessage;

		try {
			// Fetch the message
			customerMessage = await SELECT.one('btpgenai4s4.CustomerMessage').where({ ID: messageId }).forUpdate();
		} catch (error) {
			const message = 'Failed to retrieve the customer message';
			LOG.error(`${message}`, error.message);
			request.reject(400, `${message}`);
		}

		const {
			ID,
			fullMessageEnglish,
			titleCustomerLanguage,
			fullMessageCustomerLanguage,
			imageLLMDescription
		} = customerMessage;

		if (!ID || !titleCustomerLanguage || !fullMessageCustomerLanguage) {
			const message = 'Failed to retrieve important feilds from the customer message';
			LOG.error(`${message}`);
			request.reject(400, `${message}`);
		}

		if (!imageLLMDescription) {
			let base64Image;
			try {
				const [latestAttachment] = await cds.run(
					SELECT.from('btpgenai4s4.CustomerMessage:attachments')
					  .orderBy('createdAt desc')
					  .limit(1)
				  );
				const attachID = latestAttachment.ID;
				const AttachmentsSrv = await cds.connect.to("attachments");
				const contentStream = await AttachmentsSrv.get('btpgenai4s4.CustomerMessage:attachments', attachID);
				// Convert the content stream to a Base64-encoded string
				base64Image = await getBase64Content(contentStream);
			} catch (error) {
				const message = `Error when trying to generate the image description for message ${ID}`;
				LOG.error(`${message}`, `${error.message}`);
				request.reject(500, message);
			}

			// Proceed with the Base64-encoded content
			const imageInterpResultJSON = await analyseImage(base64Image, fullMessageEnglish);

			let { imageAboutFreezers, imageMatchingUserDescription, imageLLMDescription } = imageInterpResultJSON;
			// Validate the response from the image analysis service
			if (!imageAboutFreezers) {
				const message = `Incomplete response from completion service when processing issue image for the CustomerMessage ID ${ID}`;
				LOG.error(message);
				return request.reject(400, message);
			}

			try {
				if (imageAboutFreezers === "yes" && imageMatchingUserDescription === "yes") {
					await UPDATE('btpgenai4s4.CustomerMessage')
						.set({ imageAboutFreezers, imageMatchingUserDescription, imageLLMDescription })
						.where({ ID });
					const message = `CustomerMessage with ID ${ID} created and generated data inserted`
					LOG.info(message);
					request.notify( message);
				} else {
					const message = "The image you sent is not about freezers or the image is not matching the issue description";
					LOG.info(message);
					request.reject(400, message);
				}
			} catch (error) {
				const message = `Error updating CustomerMessage ID ${ID}`;
				LOG.error(`${message}`, `${error.message}`);
				request.reject(500, message);
			}
		} else {
			LOG.info(`Issue image for CustomerMessage ID ${ID} already processed`);
		}
	} catch (error) {
		// Log and handle unexpected errors
		LOG.error('An unexpected error occurred:', error.message || JSON.stringify(error));
		request.error({
			code: 500,
			message: error.message || 'An error occurred',
			target: 'ReportMessage',
			status: error.code || 500,
		});
	}
}