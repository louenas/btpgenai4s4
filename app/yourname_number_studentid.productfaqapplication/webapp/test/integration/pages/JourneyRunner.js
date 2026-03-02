sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"yournamenumberstudentid/productfaqapplication/test/integration/pages/ProductFAQList",
	"yournamenumberstudentid/productfaqapplication/test/integration/pages/ProductFAQObjectPage"
], function (JourneyRunner, ProductFAQList, ProductFAQObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('yournamenumberstudentid/productfaqapplication') + '/test/flpSandbox.html#yournamenumberstudentidproduct-tile',
        pages: {
			onTheProductFAQList: ProductFAQList,
			onTheProductFAQObjectPage: ProductFAQObjectPage
        },
        async: true
    });

    return runner;
});

