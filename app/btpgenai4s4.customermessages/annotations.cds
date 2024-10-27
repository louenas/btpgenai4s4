using btpgenai4s4Srv as service from '../../srv/service';
using from '../annotations';

annotate service.CustomerMessages with @(
    UI.FieldGroup #Main : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : customerMessageID,
            },
            {
                $Type : 'UI.DataField',
                Value : titleEnglish,
            },
            {
                $Type : 'UI.DataField',
                Value : customerName,
            },
            {
                $Type : 'UI.DataField',
                Value : productName,
            },
            {
                $Type : 'UI.DataField',
                Value : summaryEnglish,
            },
            {
                $Type : 'UI.DataField',
                Value : messageCategory,
            },
            {
                $Type : 'UI.DataField',
                Value : messageUrgency,
            },
            {
                $Type : 'UI.DataField',
                Value : messageSentiment,
            },
            {
                $Type : 'UI.DataField',
                Value : titleCustomerLanguage,
            },
            {
                $Type : 'UI.DataField',
                Value : customerId,
            },
            {
                $Type : 'UI.DataField',
                Value : productId,
            },
            {
                $Type : 'UI.DataField',
                Value : summaryCustomerLanguage,
            },
            {
                $Type : 'UI.DataField',
                Value : originatingCountry,
            },
            {
                $Type : 'UI.DataField',
                Value : sourceLanguage,
            },
            {
                $Type : 'UI.DataField',
                Value : fullMessageCustomerLanguage,
            },
            {
                $Type : 'UI.DataField',
                Value : fullMessageEnglish,
            },
            {
                $Type : 'UI.DataField',
                Value : suggestedResponseEnglish,
            },
            {
                $Type : 'UI.DataField',
                Value : suggestedResponseCustomerLanguage,
            },
            {
                $Type : 'UI.DataFieldWithUrl',
                Value : S4HCP_ServiceOrder_ServiceOrder,
                Label : 'Service Order',
                Url : 'https://my301832-api.s4hana.ondemand.com/sap/opu/odata/sap/API_SERVICE_ORDER_SRV/A_ServiceOrder(''{S4HCP_ServiceOrder_ServiceOrder}'')'
            },
        ],
    },
    UI.Identification : [
        {
            $Type : 'UI.DataField',
            Value : customerMessageID,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'btpgenai4s4Srv.Action1',
            Label : 'Generate Reply',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'btpgenai4s4Srv.Action2',
            Label : 'Maintain SO',
        },
    ],
);

annotate service.CustomerMessages with {
    S4HCP_ServiceOrder @(
        Common.Text : S4HCP_ServiceOrder.ServiceOrder,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'A_ServiceOrder',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : S4HCP_ServiceOrder_ServiceOrder,
                    ValueListProperty : 'ServiceOrder',
                },
            ],
            Label : 'Service Order',
        },
        Common.ValueListWithFixedValues : true,
    )
};

annotate service.A_ServiceOrder with {
    ServiceOrder @Common.Text : {
        $value : ServiceOrderDescription,
        ![@UI.TextArrangement] : #TextLast,
    }
};

