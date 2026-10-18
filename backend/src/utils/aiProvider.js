/**
 * Provider-agnostic chat completion.
 * Default: Hugging Face Inference Providers (OpenAI-compatible router).
 */

function getAiConfig() {
  const rawProvider = (process.env.AI_PROVIDER || 'huggingface').trim().toLowerCase();
  let provider = 'huggingface';
  if (rawProvider === 'openai') provider = 'openai';
  if (rawProvider === 'groq') provider = 'groq';

  return {
    provider,
    hfToken: (process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '').trim(),
    // Prefer a model that appears on the current HF Inference Providers catalog.
    hfModel: (process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct').trim(),
    hfBaseUrl: (process.env.HF_BASE_URL || 'https://router.huggingface.co/v1').replace(/\/$/, ''),
    groqKey: (process.env.GROQ_API_KEY || '').trim(),
    groqModel: (process.env.GROQ_MODEL || 'llama-3.1-8b-instant').trim(),
    groqBaseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
    openaiKey: (process.env.OPENAI_API_KEY || '').trim(),
    openaiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  };
}

function isAiConfigured() {
  const cfg = getAiConfig();
  if (cfg.provider === 'openai') return Boolean(cfg.openaiKey);
  if (cfg.provider === 'groq') return Boolean(cfg.groqKey);
  return Boolean(cfg.hfToken);
}

function getAiStatus() {
  const cfg = getAiConfig();
  let model = cfg.hfModel;
  if (cfg.provider === 'openai') model = cfg.openaiModel;
  if (cfg.provider === 'groq') model = cfg.groqModel;
  return {
    configured: isAiConfigured(),
    provider: cfg.provider,
    model,
  };
}

async function chatCompletion({ messages, maxTokens = 700, temperature = 0.4 }) {
  const cfg = getAiConfig();

  if (cfg.provider === 'openai') {
    if (!cfg.openaiKey) {
      const error = new Error('OpenAI is not configured (missing OPENAI_API_KEY)');
      error.statusCode = 503;
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }
    return openAiCompatibleChat({
      baseUrl: cfg.openaiBaseUrl,
      apiKey: cfg.openaiKey,
      model: cfg.openaiModel,
      messages,
      maxTokens,
      temperature,
    });
  }

  if (cfg.provider === 'groq') {
    if (!cfg.groqKey) {
      const error = new Error(
        'AI coach is not configured. Add GROQ_API_KEY from https://console.groq.com/keys'
      );
      error.statusCode = 503;
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }
    return openAiCompatibleChat({
      baseUrl: cfg.groqBaseUrl,
      apiKey: cfg.groqKey,
      model: cfg.groqModel,
      messages,
      maxTokens,
      temperature,
    });
  }

  // huggingface (default)
  if (!cfg.hfToken) {
    const error = new Error(
      'AI coach is not configured. Add HF_TOKEN from https://huggingface.co/settings/tokens'
    );
    error.statusCode = 503;
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  return openAiCompatibleChat({
    baseUrl: cfg.hfBaseUrl,
    apiKey: cfg.hfToken,
    model: cfg.hfModel,
    messages,
    maxTokens,
    temperature,
  });
}

async function openAiCompatibleChat({
  baseUrl,
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message
      || payload?.error
      || payload?.message
      || `AI provider error (${response.status})`;
    let text = typeof message === 'string' ? message : JSON.stringify(message);
    if (response.status === 402 || /no remaining credits/i.test(text)) {
      text = 'Hugging Face Inference credits are used up. Add credits/PRO, or switch AI_PROVIDER=groq with a free GROQ_API_KEY.';
    } else if (/not supported by any provider/i.test(text)) {
      text = `${text} Try HF_MODEL=meta-llama/Llama-3.1-8B-Instruct or Qwen/Qwen3-8B in backend/.env.`;
    }
    const error = new Error(text);
    error.statusCode = response.status === 401 || response.status === 403
      ? response.status
      : 502;
    error.code = response.status === 402 || /credits/i.test(text)
      ? 'AI_CREDITS_EXHAUSTED'
      : /not supported by any provider/i.test(String(message))
        ? 'AI_MODEL_UNAVAILABLE'
        : 'AI_PROVIDER_ERROR';
    error.details = payload;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    const error = new Error('AI returned an empty reply. Try again in a moment.');
    error.statusCode = 502;
    error.code = 'AI_EMPTY_REPLY';
    throw error;
  }

  return {
    content: String(content).trim(),
    model: payload?.model || model,
    usage: payload?.usage || null,
  };
}

module.exports = {
  getAiConfig,
  isAiConfigured,
  getAiStatus,
  chatCompletion,
};
