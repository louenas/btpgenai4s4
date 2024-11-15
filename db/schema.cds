namespace btpgenai4s4;

using { S4HCP_ServiceOrder_Odata } from '../srv/external/S4HCP_ServiceOrder_Odata.cds';

using { cuid } from '@sap/cds/common';

entity CustomerMessage : cuid
{
    customerMessageID : Integer
        @mandatory;
    titleEnglish : String(150);
    customerName : String(50);
    productName : String(50);
    summaryEnglish : String(1000);
    messageCategory : String(50);
    messageUrgency : String(50);
    messageSentiment : String(50);
    titleCustomerLanguage : String(150);
    customerId : String(40);
    productId : String(40);
    summaryCustomerLanguage : String(1000);
    originatingCountry : String(50);
    sourceLanguage : String(50);
    fullMessageCustomerLanguage : String(5000);
    fullMessageEnglish : String(5000);
    suggestedResponseEnglish : String(5000);
    suggestedResponseCustomerLanguage : String(5000);
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

