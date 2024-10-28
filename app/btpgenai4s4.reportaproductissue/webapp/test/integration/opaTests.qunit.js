sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'btpgenai4s4/reportaproductissue/test/integration/FirstJourney',
		'btpgenai4s4/reportaproductissue/test/integration/pages/ReportMessageObjectPage'
    ],
    function(JourneyRunner, opaJourney, ReportMessageObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('btpgenai4s4/reportaproductissue') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheReportMessageObjectPage: ReportMessageObjectPage
                }
            },
            opaJourney.run
        );
    }
);