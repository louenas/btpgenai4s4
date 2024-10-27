const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

/**
 * 
 * @On(event = { "Action2" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
	try {
		const { ID } = request.params[0] || {};
		if (!ID) {
			return request.reject(400, 'ID parameter is missing.');
		}
	
		const customerMessage = await SELECT.one.from('btpgenai4s4.CustomerMessages').where({ ID });
		if (!customerMessage) {
			return request.reject(400, `CustomerMessage with ID ${ID} not found.`);
		}
		
		const { titleEnglish, fullMessageEnglish, suggestedResponseEnglish, S4HCP_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;
	
		if (!titleEnglish || !fullMessageEnglish) {
			return request.reject(400, 'Customer message data is incomplete');
		}
	
		const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
		const { A_ServiceOrder, A_ServiceOrderText } = s4HcpServiceOrderOdata.entities;
	
		if (attachedSOId) {
			try {
				const finalNote = await s4HcpServiceOrderOdata.run(
					INSERT.into(A_ServiceOrderText, {
						ServiceOrder: attachedSOId,
						Language: 'EN',
						LongTextID: 'S003',
						LongText: suggestedResponseEnglish
					})
				);
				LOG.info(`Created Service Order Note: ${JSON.stringify(finalNote)}`);
			} catch (error) {
				LOG.error('Error adding note to existing service order:', error.message);
				return request.reject(500, 'Failed to add note to service order');
			}
		} else {
			const itemDur = {
				ServiceOrderItemDescription: 'Service Order duration',
				Product: 'SRV_01',
				ServiceDuration: 1,
				ServiceDurationUnit: 'HR'
			};
			const itemQty = {
				ServiceOrderItemDescription: 'Service Order quantity',
				Product: 'SRV_02',
				Quantity: 1,
				QuantityUnit: 'EA'
			};
			const persResp = { PersonResponsible: '9980003640' };
			const initNote = {
				Language: 'EN',
				LongTextID: 'S001',
				LongText: fullMessageEnglish
			};
			const servOrder = {
				ServiceOrderType: 'SVO1',
				ServiceOrderDescription: titleEnglish,
				Language: 'EN',
				ServiceDocumentPriority: '5',
				SalesOrganization: '1710',
				DistributionChannel: '10',
				Division: '00',
				SoldToParty: '17100002',
				to_PersonResponsible: [persResp],
				to_Item: [itemDur, itemQty],
				to_Text: [initNote]
			};
	
			let serviceOrder;
			try {
				serviceOrder = await s4HcpServiceOrderOdata.run(INSERT.into(A_ServiceOrder, servOrder));
			} catch (error) {
				LOG.error('Error creating service order:', error.message);
				return request.reject(500, 'Failed to create service order.');
			}
	
			const soId = serviceOrder.ServiceOrder;
			LOG.info(`Created Service Order: ${JSON.stringify(serviceOrder)}`);
	
			try {
				await UPDATE('btpgenai4s4.CustomerMessages')
					.set({ S4HCP_ServiceOrder_ServiceOrder: soId })
					.where({ ID });
			} catch (error) {
				LOG.error('Error updating customer message with service order ID:', error.message);
				return request.reject(500, 'Failed to update customer message.');
			}
	
			LOG.info(`Updated customer message with Service Order Id: ${soId}`);
		}
	
	} catch (err) {
		LOG.error('An unexpected error occurred:', err.message || JSON.stringify(err));
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: err.message || 'An error occurred',
			target: 'CreateOrUpdateServiceOrder',
			status: err.code || 500,
		});
	}
}