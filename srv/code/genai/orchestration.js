const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

// Configuration object for the LLM, specifying model name and parameters.
const LLM_CONFIG = {
    model_name: 'gpt-4o-mini',
    model_params: {
        temperature: 0.1,
        response_format: {
            type: 'json_object',
        },
    }
};

// System message to set the context for the LLM.
const SYSTEM_MESSAGE = { role: 'system', content: 'You are a support agent for our freezers products' };

// Function to create an orchestration client using the specified prompt.
async function createOrchestrationClient(prompt) {
    const { OrchestrationClient, buildAzureContentFilter } = await import('@sap-ai-sdk/orchestration');
    return new OrchestrationClient({
        llm: LLM_CONFIG,
        templating: {
            template: [
                SYSTEM_MESSAGE,
                { role: 'user', content: prompt }
            ]
        }
    });
}

// Function to create an orchestration client for image analysis using the specified prompt.
async function createOrchestrationClientForImageAnalysis(prompt) {
    const { OrchestrationClient, buildAzureContentFilter } = await import('@sap-ai-sdk/orchestration');
    return new OrchestrationClient({
        llm: LLM_CONFIG,
        templating: {
            template: [
                SYSTEM_MESSAGE,
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `${prompt}`,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: '{{?imageUrl}}'
                            }
                        }
                    ]
                }
            ]
        }
    });
}

// Preprocess customer message by categorizing, translating, and summarizing.
// Takes title and full message in customer's language.
// Returns structured JSON with translated title and message, summaries, categories, urgency, and sentiment.

async function preprocessCustomerMessage(titleCustomerLanguage, fullMessageCustomerLanguage) {
    const prompt = `
    Categorize the fullMessageCustomerLanguage into one of (Technical, Delivery, Service). 
    Classify urgency of the fullMessageCustomerLanguage into one of (High, Medium, Low). 
    Classify sentiment of the fullMessageCustomerLanguage into one of (Negative, Positive, Neutral). 
    Translate fullMessageCustomerLanguage to English and put it in fullMessageEnglish.
    Summarize fullMessageCustomerLanguage into 20 words max and keep the original language and put it in summaryCustomerLanguage. 
    Translate the summaryCustomerLanguage to English and put it in summaryEnglish.
    Translate the titleCustomerLanguage to English and put it in titleEnglish. 
    Here is the titleCustomerLanguage and fullMessageCustomerLanguage:
    titleCustomerLanguage: {{?titleCustomerLanguage}}
    fullMessageCustomerLanguage: {{?fullMessageCustomerLanguage}}
    Return the result in the following JSON template:
    {
        fullMessageEnglish: Text,
        titleEnglish: Text, 
        summaryCustomerLanguage: Text, 
        summaryEnglish: Text, 
        messageCategory: Text, 
        messageUrgency: Text, 
        messageSentiment: Text
    }`;

    try {
        const orchestrationClient = await createOrchestrationClient(prompt);
        const response = await orchestrationClient.chatCompletion({
            inputParams: { titleCustomerLanguage, fullMessageCustomerLanguage }
        });
        return JSON.parse(response.getContent());
    } catch (error) {
        LOG.error('Error in preprocessing:', error);
        throw new Error('Preprocessing service failed.');
    }
}

// generate a response for customer technical messages
async function generateResponseTechMessage(issue, question, answer, fullMessageCustomerLanguage, imageLLMDescription, soContext) {
    // Define a prompt that provides the context for generating a technical response
    let prompt = `
    Generate a helpful reply message including the troubleshooting procedure to the newCustomerMessage based on previousCustomerMessages and relevantFAQItem. 
    The suggestedResponseCustomerLanguage should be in the same language of the newCustomerMessage:
    relevantFAQItem: issue - {{?issue}}, Question - {{?question}} and Answer - {{?answer}}
    newCustomerMessage: {{?fullMessageCustomerLanguage}}`;
    if (imageLLMDescription) prompt += `imageDescription: {{?imageLLMDescription}}`;
    prompt += `previousCustomerMessages: {{?soContext}}
    Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
    {
        suggestedResponseEnglish: Text,
        suggestedResponseCustomerLanguage: Text
    }`;

    try {
        // Create orchestration client using the generated prompt
        const orchestrationClient = await createOrchestrationClient(prompt);
        // Get the response by providing the required input parameters
        let response;
        if (imageLLMDescription)  
            response = await orchestrationClient.chatCompletion({
            inputParams: { issue, question, answer, fullMessageCustomerLanguage, imageLLMDescription, soContext }});
        else 
            response = await orchestrationClient.chatCompletion({
            inputParams: { issue, question, answer, fullMessageCustomerLanguage, soContext }
            });

        // Parse and return the generated response in JSON format
        return JSON.parse(response.getContent());
    } catch (error) {
        // Log an error message and re-throw an error if response generation fails
        LOG.error('Error generating tech message response:', error);
        throw new Error('Response generation service failed.');
    }
}

// generate a response for customer non-technical messages
async function generateResponseOtherMessage(messageSentiment, fullMessageCustomerLanguage, imageLLMDescription, soContext) {
    // Determine message type based on customer sentiment (either an apology or a thank you note)
    const messageType = messageSentiment === 'Negative' ? 'a "we are sorry" note' : 'a gratitude note';


    
    let prompt = `
    Generate {{?messageType}} to the newCustomerMessage based on previous customer messages previousCustomerMessages. 
    The suggestedResponseCustomerLanguage should be in the same language of the newCustomerMessage:
    newCustomerMessage: {{?fullMessageCustomerLanguage}}`;
    if (imageLLMDescription) prompt += `imageDescription: {{?imageLLMDescription}}`;
    prompt += `previousCustomerMessages: {{?soContext}}
    Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
    {
        suggestedResponseEnglish: Text,
        suggestedResponseCustomerLanguage: Text
    }`;

    try {
        // Create orchestration client using the generated prompt
        const orchestrationClient = await createOrchestrationClient(prompt);
        // Get the response by providing the required input parameters


        let response;
        if (imageLLMDescription)  
            response = await orchestrationClient.chatCompletion({
                inputParams: { messageType, fullMessageCustomerLanguage, imageLLMDescription, soContext  }
            });
        else 
            response = await orchestrationClient.chatCompletion({
                inputParams: { messageType, fullMessageCustomerLanguage, soContext  }
            });

        // Parse and return the generated response in JSON format
        return JSON.parse(response.getContent());
    } catch (error) {
        // Log an error message and re-throw an error if response generation fails
        LOG.error('Error generating other message response:', error);
        throw new Error('Response generation service failed.');
    }
}

// analyse the generated the description of the issue's image
async function analyseImage(imageBase64, customerIssueDescription) {
    const prompt = `
    This is the issue description submitted by the customer {{?customerIssueDescription}}.
    Generate a description in English of the submitted image and put it in the field imageLLMDescription.
    If the image is not about freezers then return the JSON {imageAboutFreezers: no}.
    If the issue description submitted by the customer matches the image then return the JSON {imageAboutFreezers: yes, imageMatchingUserDescription: yes, imageLLMDescription: Text}                
    Otherwise return the JSON {imageAboutFreezers: yes, imageMatchingUserDescription: no, imageLLMDescription: Text}`;

    const orchestrationClient = await createOrchestrationClientForImageAnalysis(prompt);

    const response = await orchestrationClient.chatCompletion({
        inputParams: { imageUrl: 'data:image/jpeg;base64,' + imageBase64, customerIssueDescription }
    });

    return JSON.parse(response.getContent());
};

module.exports = {
    preprocessCustomerMessage,
    generateResponseTechMessage,
    generateResponseOtherMessage,
    analyseImage,
};