const cds = require('@sap/cds');
const LOG = cds.log('GenAI');

const LLM_CONFIG = {
  model_name: 'gpt-4o-mini',
  model_params: {
    max_tokens: 2048,
    temperature: 0.1,
    response_format: {
      type: 'json_object',
    },
  }
};

const SYSTEM_MESSAGE = { role: 'system', content: 'You are a support agent for our freezers products' };

async function createOrchestrationClient(prompt) {
    const { OrchestrationClient, buildAzureContentFilter } = await import('@sap-ai-sdk/orchestration');
    return new OrchestrationClient({
        llm: LLM_CONFIG,
        templating: {
            template: [
                SYSTEM_MESSAGE,
                { role: 'user', content: prompt }
            ]
        },
        filtering: {
            input: buildAzureContentFilter({ SelfHarm: 0 })
        }
    });
}

async function orchestrationCompletionSimple(prompt) {
    try {
        const orchestrationClient = await createOrchestrationClient(prompt);
        const response = await orchestrationClient.chatCompletion();
        return JSON.parse(response.getContent());
    } catch (error) {
        LOG.error('Error in orchestration:', error);
        throw new Error('Orchestration service failed.');
    }
}

async function orchestrationCompletionTemplate(prompt) {
    try {
        const orchestrationClient = await createOrchestrationClient(prompt);
        const response = await orchestrationClient.chatCompletion({
            inputParams: { arg1: '', arg2: "" }
        });
        return JSON.parse(response.getContent());
    } catch (error) {
        LOG.error('Error in orchestration:', error);
        throw new Error('Orchestration service failed.');
    }
}

async function preprocessCustomerMassage(titleCustomerLanguage, fullMessageCustomerLanguage) {
    const prompt = `
    Categorize the fullMessageCustomerLanguage into one of (Technical, Delivery, Service). 
    Classify urgency of the fullMessageCustomerLanguage into one of (High, Medium, Low). 
    Classify sentiment of the fullMessageCustomerLanguage into one of (Negative, Positive, Neutral). 
    Translate fullMessageCustomerLanguage to English and put it in fullMessageEnglish.
    Summarize fullMessageCustomerLanguage into 20 words max and keep the original language and put it in summaryCustomerLanguage. 
    Translate the summaryCustomerLanguage to English and put it in summaryEnglish.
    Translate the titleCustomerLanguage to English and put it in titleEnglish.
    Return the result in the following JSON template:
    titleCustomerLanguage: {{?titleCustomerLanguage}}
    fullMessageCustomerLanguage: {{?fullMessageCustomerLanguage}}
    JSON template: {
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

async function generateResponseTechMessage(issue, question, answer, fullMessageCustomerLanguage, soContext) {
    const prompt = `
    Generate a helpful reply message including the troubleshooting procedure to the newCustomerMessage based on previousCustomerMessages and relevantFAQItem:
    relevantFAQItem: issue - {{?issue}}, Question - {{?question}} and Answer - {{?answer}}
    newCustomerMessage: {{?fullMessageCustomerLanguage}}
    previousCustomerMessages: {{?soContext}}
    Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
    JSON template: {
        suggestedResponseEnglish: Text,
        suggestedResponseCustomerLanguage: Text
    }`;

    try {
        const orchestrationClient = await createOrchestrationClient(prompt);
        const response = await orchestrationClient.chatCompletion({
            inputParams: { issue, question, answer, fullMessageCustomerLanguage, soContext }
        });
        return JSON.parse(response.getContent());
    } catch (error) {
        LOG.error('Error generating tech message response:', error);
        throw new Error('Response generation service failed.');
    }
}

async function generateResponseOtherMessage(messageSentiment, fullMessageCustomerLanguage, soContext) {
    const messageType = messageSentiment === 'Negative' ? 'a "we are sorry" note' : 'a gratitude note';
    const prompt = `
    Generate {{?messageType}} to the newCustomerMessage:
    newCustomerMessage: {{?fullMessageCustomerLanguage}}
    previousCustomerMessages: {{?soContext}}
    Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
    JSON template: {
        suggestedResponseEnglish: Text,
        suggestedResponseCustomerLanguage: Text
    }`;

    try {
        const orchestrationClient = await createOrchestrationClient(prompt);
        const response = await orchestrationClient.chatCompletion({
            inputParams: { messageType, fullMessageCustomerLanguage, soContext }
        });
        return JSON.parse(response.getContent());
    } catch (error) {
        LOG.error('Error generating other message response:', error);
        throw new Error('Response generation service failed.');
    }
}

module.exports = {
    preprocessCustomerMassage, 
    generateResponseTechMessage, 
    generateResponseOtherMessage,
};