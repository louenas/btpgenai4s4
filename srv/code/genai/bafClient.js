const axios = require('axios');

class TokenFetching {
  constructor(tokenServiceUrl, clientId, clientSecret) {
    this.tokenServiceUrl = tokenServiceUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.lastToken = undefined;
  }

  getCurrentTimeInSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  async getToken() {
    if (
      !this.lastToken ||
      this.lastToken.expiresAt * 0.9 < this.getCurrentTimeInSeconds()
    ) {
      this.lastToken = await this.getNewAuthToken(
        this.tokenServiceUrl,
        this.clientId,
        this.clientSecret
      );
    }
    return this.lastToken.token;
  }

  async getNewAuthToken(tokenServiceUrl, clientId, clientSecret) {
    const formData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });

    const response = await axios.post(tokenServiceUrl, formData, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
    });

    return {
      token: response.data.access_token,
      expiresAt: this.getCurrentTimeInSeconds() + response.data.expires_in,
    };
  }
}

class AgentClient {
  constructor(tokenFetcher, baseUrl) {
    this.tokenFetcher = tokenFetcher;
    this.baseUrl = baseUrl;
  }

  createClient() {
    const instance = axios.create({
      baseURL: this.baseUrl,
      timeout: 1000 * 60 * 5,
    });

    instance.interceptors.request.use(async (config) => {
      const token = await this.tokenFetcher.getToken();
      config.headers.Authorization = 'Bearer ' + token;
      return config;
    });

    return instance;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAgent(prompt) {
  const credentials = {
    clientId: 'sb-3af5b3ae-9095-4bb6-af57-8cf7342daa26!b437077|business-agent-foundation!b271516',
    clientSecret: '87041179-5a7d-4b75-be75-c695dccc3eb5$DXJUIngK6oxjVc3qo8Z9-KBbnNDgWkjYt-f-lZqB958=',
    tokenUrl: 'https://bafplayground-wyqp4mwi.authentication.us10.hana.ondemand.com/oauth/token',
    apiUrl: 'https://business-agent-foundation-srv-unified-agent.d44b0b9.kyma.ondemand.com/',
  };

  const tokenFetcher = new TokenFetching(
    credentials.tokenUrl,
    credentials.clientId,
    credentials.clientSecret
  );
  const agentClient = new AgentClient(tokenFetcher, credentials.apiUrl);
  const client = agentClient.createClient();

  // // 1. Create Agent
  // const createAgentResponse = await client.post('/api/v1/Agents', {
  //   name: 'Document Reader Agent',
  // });

  // // 2. Add document tool
  // const createToolResponse = await client.post(
  //   `/api/v1/Agents(${createAgentResponse.data.ID})/tools`,
  //   {
  //     name: 'Doc Tool',
  //     type: 'document',
  //   }
  // );

  // // 3. Upload a document
  // const addToolResource = await client.post(
  //   `/api/v1/Agents(${createAgentResponse.data.ID})/tools(${createToolResponse.data.ID})/resources`,
  //   {
  //     name: 'Price list',
  //     contentType: 'text/plain',
  //     data: Buffer.from(
  //       '1. Apple: $1\n2. Banana: $2\n3. Cherry: $3\n'
  //     ).toString('base64'),
  //   }
  // );

  // // 4. Wait for resource to be ready
  // let documentReady = false;
  // while (!documentReady) {
  //   await sleep(3000);
  //   const resource = await client.get(
  //     `/api/v1/Agents(${createAgentResponse.data.ID})/tools(${createToolResponse.data.ID})/resources(${addToolResource.data.ID})`
  //   );
  //   if (resource.data.state === 'error') {
  //     throw new Error('Resource failed to load: ' + resource.data.lastError);
  //   }
  //   documentReady = resource.data.state === 'ready';
  // }

  // // 5. Wait for tool to be ready
  // let toolReady = false;
  // while (!toolReady) {
  //   await sleep(3000);
  //   const tool = await client.get(
  //     `/api/v1/Agents(${createAgentResponse.data.ID})/tools(${createToolResponse.data.ID})`
  //   );
  //   if (tool.data.state === 'error') {
  //     throw new Error('Tool failed to load: ' + tool.data.lastError);
  //   }
  //   toolReady = tool.data.state === 'ready';
  // }

  const agentId = '8d5f8e3e-4691-4016-a264-552e6f4382a9';
  // 6. Create chat
  const createChatResponse = await client.post(
    `/api/v1/Agents(${agentId})/chats`,
    { name: 'S4HANA Service Order Chat ' + Math.random() }
  );

  // 7. Send a message
  const startChatResponse = await client.post(
    `/api/v1/Agents(${agentId})/chats(${createChatResponse.data.ID})/UnifiedAiAgentService.sendMessage`,
    { msg: prompt, async: true }
  );

  // 8. Poll for the answer
  let agentAnswer;
  while (true) {
    const answers = await client.get(
      `/api/v1/Agents(${agentId})/chats(${createChatResponse.data.ID})/history?$filter=previous/ID eq ${startChatResponse.data.historyId}`
    );

    if (answers.data.value.length === 0) {
      // check for chat failure
      const chatStatus = await client.get(
        `/api/v1/Agents(${agentId})/chats(${createChatResponse.data.ID})?$select=state`
      );
      if (chatStatus.data.state === 'failed') {
        throw new Error('Chat failed');
      }
      await sleep(5000);
      continue;
    }

    agentAnswer = answers.data.value[0].content;
    break;
  }

  return agentAnswer;
}

module.exports = { callAgent };