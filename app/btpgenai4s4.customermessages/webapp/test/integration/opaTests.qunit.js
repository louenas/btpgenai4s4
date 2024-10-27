sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'btpgenai4s4/customermessages/test/integration/FirstJourney',
		'btpgenai4s4/customermessages/test/integration/pages/CustomerMessagesList',
		'btpgenai4s4/customermessages/test/integration/pages/CustomerMessagesObjectPage'
    ],
    function(JourneyRunner, opaJourney, CustomerMessagesList, CustomerMessagesObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('btpgenai4s4/customermessages') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheCustomerMessagesList: CustomerMessagesList,
					onTheCustomerMessagesObjectPage: CustomerMessagesObjectPage
                }
            },
            opaJourney.run
        );
    }
);