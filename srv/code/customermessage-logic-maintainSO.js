const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
//import bafClient
const { callAgent } = require('./genai/bafClient');

/**
 * Handles an action on the CustomerMessages entity, connecting to S/4HANA OData services and updating records as needed.
 * @On(event = { "Action2" }, entity = "btpgenai4s4Srv.CustomerMessages")
 * @param {Object} request - Contains user information, tenant-specific CDS model, headers, and query parameters
 */
module.exports = async function (request) {
	const { ID } = request.params[0] || {};
	// Validate the presence of the ID parameter
	if (!ID) {
		request.reject(400, 'ID parameter is missing.');
	}

   let lastOrder = await callAgent("get the last created Service order").catch(err => console.error(err))
	console.log('Last order retrieved:', lastOrder);

	let customerMessage;
	try {
		// Retrieve the specific customer message record using the provided ID
		customerMessage = await SELECT.one.from('btpgenai4s4.CustomerMessage').where({ ID }).forUpdate();
	} catch (error) {
		LOG.error('Failed to retrieve customer message', error.message);
		request.reject(500, `Failed to retrieve customer message with ID ${ID}`);
	}

	// const { titleEnglish, fullMessageEnglish, suggestedResponseEnglish, S4HCP_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;

	// // Ensure essential fields are present in the customer message
	// if (!titleEnglish || !fullMessageEnglish) {
	// 	request.reject(400, 'Customer message data is incomplete');
	// }

	// let s4HcpServiceOrderOdata;
	// try {
	// 	// Establish a connection to the S/4HANA Cloud OData Service Order
	// 	s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
	// } catch (error) {
	// 	LOG.error('Failed to connect to S/4HANA Cloud OData Service Order', error.message);
	// 	request.reject(500, 'Failed to connect to S/4HANA Cloud OData Service Order');
	// }
	// const { A_ServiceOrder, A_ServiceOrderText } = s4HcpServiceOrderOdata.entities;

	// // Add a note to the existing Service order else create a new Service order with initial details and note
	// if (attachedSOId) {
	// 	try {
	// 		// Append a note to the existing service order
	// 		const finalNote = await s4HcpServiceOrderOdata.run(
	// 			INSERT.into(A_ServiceOrderText, {
	// 				ServiceOrder: attachedSOId,
	// 				Language: 'EN',
	// 				LongTextID: 'S003',
	// 				LongText: suggestedResponseEnglish
	// 			})
	// 		);
	// 		LOG.info(`Created Service Order Note: ${JSON.stringify(finalNote)}`);
	// 	} catch (error) {
	// 		LOG.error('Failed to add note to service order', error.message);
	// 		request.reject(500, 'Failed to add note to service order');
	// 	}
	// } else {
	// 	// Define the service order's items, responsible person, and initial note
	// 	const itemDur = {
	// 		ServiceOrderItemDescription: 'Service Order duration',
	// 		Product: 'SRV_01',
	// 		ServiceDuration: 1,
	// 		ServiceDurationUnit: 'HR'
	// 	};
	// 	const itemQty = {
	// 		ServiceOrderItemDescription: 'Service Order quantity',
	// 		Product: 'SRV_02',
	// 		Quantity: 1,
	// 		QuantityUnit: 'EA'
	// 	};
	// 	const persResp = { PersonResponsible: '9980003640' };
	// 	const initNote = {
	// 		Language: 'EN',
	// 		LongTextID: 'S001',
	// 		LongText: fullMessageEnglish
	// 	};

	// 	// Create a new service order object with the defined details
	// 	const servOrder = {
	// 		ServiceOrderType: 'SVO1',
	// 		ServiceOrderDescription: titleEnglish,
	// 		Language: 'EN',
	// 		ServiceDocumentPriority: '5',
	// 		SalesOrganization: '1710',
	// 		DistributionChannel: '10',
	// 		Division: '00',
	// 		SoldToParty: '17100002',
	// 		to_PersonResponsible: [persResp],
	// 		to_Item: [itemDur, itemQty],
	// 		to_Text: [initNote]
	// 	};

	// 	let serviceOrder;
	// 	try {
	// 		// Insert the new service order into the S4HCP system
	// 		serviceOrder = await s4HcpServiceOrderOdata.run(INSERT.into(A_ServiceOrder, servOrder));
	// 	} catch (error) {
	// 		LOG.error('Failed to create service order.', error.message);
	// 		request.reject(500, 'Failed to create service order.');
	// 	}

	// 	const soId = serviceOrder.ServiceOrder;
	// 	LOG.info(`Created Service Order: ${JSON.stringify(serviceOrder)}`);

		try {
			// Update the customer message record with the new Service order ID
			await UPDATE('btpgenai4s4.CustomerMessage')
				.set({ suggestedResponseEnglish: lastOrder })
				.where({ ID });
			LOG.info(`Updated customer message with Service Order Id: ${ID}`);
		} catch (error) {
			LOG.error('Failed to update customer message', error.message);
			request.reject(500, `Failed to update customer message for service order ID ${ID}`);
		}
	// }
}
