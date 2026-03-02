sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"yournamenumberstudentid/customermessages/test/integration/pages/CustomerMessageList",
	"yournamenumberstudentid/customermessages/test/integration/pages/CustomerMessageObjectPage"
], function (JourneyRunner, CustomerMessageList, CustomerMessageObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('yournamenumberstudentid/customermessages') + '/test/flpSandbox.html#yournamenumberstudentidcustome-tile',
        pages: {
			onTheCustomerMessageList: CustomerMessageList,
			onTheCustomerMessageObjectPage: CustomerMessageObjectPage
        },
        async: true
    });

    return runner;
});

