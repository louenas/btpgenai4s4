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

module.exports = { getBase64Content };