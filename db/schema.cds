namespace btpgenai4s4;

using { S4HCP_ServiceOrder_Odata } from '../srv/external/S4HCP_ServiceOrder_Odata.cds';

using { cuid } from '@sap/cds/common';

entity CustomerMessages : cuid
{
    customerMessageID : Integer
        @mandatory;
    titleEnglish : String(100);
    customerName : String(100);
    productName : String(100);
    summaryEnglish : String(500);
    messageCategory : String(50);
    messageUrgency : String(20);
    messageSentiment : String(20);
    titleCustomerLanguage : String(100);
    customerId : String(50);
    productId : String(50);
    summaryCustomerLanguage : String(500);
    originatingCountry : String(50);
    sourceLanguage : String(20);
    fullMessageCustomerLanguage : String(1000);
    fullMessageEnglish : String(1000);
    suggestedResponseEnglish : String(500);
    suggestedResponseCustomerLanguage : String(500);
    S4HCP_ServiceOrder : Association to one S4HCP_ServiceOrder_Odata.A_ServiceOrder;
}

entity ProductFAQ
{
    key ID : Integer;
    issue : LargeString;
    question : LargeString;
    answer : LargeString;
    embedding : Vector(1536);
}

annotate CustomerMessages with @assert.unique :
{
    customerMessageID : [ customerMessageID ],
};

