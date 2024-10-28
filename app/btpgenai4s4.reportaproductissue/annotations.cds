using btpgenai4s4Srv as service from '../../srv/service';
annotate service.ReportMessage with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'customerMessageID',
                Value : customerMessageID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'customerName',
                Value : customerName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'productName',
                Value : productName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'titleCustomerLanguage',
                Value : titleCustomerLanguage,
            },
            {
                $Type : 'UI.DataField',
                Label : 'customerId',
                Value : customerId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'productId',
                Value : productId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'originatingCountry',
                Value : originatingCountry,
            },
            {
                $Type : 'UI.DataField',
                Label : 'sourceLanguage',
                Value : sourceLanguage,
            },
            {
                $Type : 'UI.DataField',
                Label : 'fullMessageCustomerLanguage',
                Value : fullMessageCustomerLanguage,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ]
);

