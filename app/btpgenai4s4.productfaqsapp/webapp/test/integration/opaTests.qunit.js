sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'btpgenai4s4/productfaqsapp/test/integration/FirstJourney',
		'btpgenai4s4/productfaqsapp/test/integration/pages/ProductFAQList',
		'btpgenai4s4/productfaqsapp/test/integration/pages/ProductFAQObjectPage'
    ],
    function(JourneyRunner, opaJourney, ProductFAQList, ProductFAQObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('btpgenai4s4/productfaqsapp') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheProductFAQList: ProductFAQList,
					onTheProductFAQObjectPage: ProductFAQObjectPage
                }
            },
            opaJourney.run
        );
    }
);