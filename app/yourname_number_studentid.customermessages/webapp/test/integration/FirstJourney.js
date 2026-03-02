sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheCustomerMessageList.iSeeThisPage();
            Then.onTheCustomerMessageList.onFilterBar().iCheckFilterField("Customer Message ID");
            Then.onTheCustomerMessageList.onTable().iCheckColumns(18, {"customerMessageID":{"header":"Customer Message ID"},"titleEnglish":{"header":"Title (English)"},"customerName":{"header":"Customer Name"},"productName":{"header":"Product Name"},"summaryEnglish":{"header":"Summary (English)"},"messageCategory":{"header":"Message Category"},"messageUrgency":{"header":"Message Urgency"},"messageSentiment":{"header":"Message Sentiment"},"titleCustomerLanguage":{"header":"Title (Customer Language)"},"customerId":{"header":"Customer ID"},"productId":{"header":"Product ID"},"summaryCustomerLanguage":{"header":"Summary (Customer Language)"},"originatingCountry":{"header":"Originating Country"},"sourceLanguage":{"header":"Source Language"},"fullMessageCustomerLanguage":{"header":"Full Message (Customer Language)"},"fullMessageEnglish":{"header":"Full Message (English)"},"suggestedResponseEnglish":{"header":"Suggested Response (English)"},"suggestedResponseCustomerLanguage":{"header":"Suggested Response (Customer Language)"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheCustomerMessageList.onFilterBar().iExecuteSearch();
            
            Then.onTheCustomerMessageList.onTable().iCheckRows();

            When.onTheCustomerMessageList.onTable().iPressRow(0);
            Then.onTheCustomerMessageObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});