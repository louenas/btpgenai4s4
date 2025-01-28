/**
 * 
 * @Before(event = { "CREATE" }, entity = "btpgenai4s4Srv.ReportMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	// Check if the attached file is an image
	const mimeType = request.data.attachments[0]?.mimeType;
	if (!mimeType?.startsWith('image/')) {
		request.reject('Please submit an image.');
		return;
	}
}