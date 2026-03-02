using yourName_Number_StudentIDSrv as service from '../../srv/service';
using from '../annotations';

annotate service.CustomerMessage with @(
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
                $Type : 'UI.DataField',
                Value : S4HCP_ServiceOrder_ServiceOrder,
                Label : 'Service Order',
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
            Action : 'yourName_Number_StudentIDSrv.Action1',
            Label : 'Generate Reply',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'yourName_Number_StudentIDSrv.Action2',
            Label : 'Maintain SO',
        },
    ],
);

annotate service.CustomerMessage with {
    S4HCP_ServiceOrder @(
        Common.Text : S4HCP_ServiceOrder.ServiceOrderDescription,
        Common.Text.@UI.TextArrangement : #TextSeparate,
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
    ServiceOrder @(
        Common.Text : ServiceOrderDescription,
        Common.Text.@UI.TextArrangement : #TextLast,
)};

