sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'btpgenai4s4.customermessages',
            componentId: 'CustomerMessagesList',
            contextPath: '/CustomerMessages'
        },
        CustomPageDefinitions
    );
});