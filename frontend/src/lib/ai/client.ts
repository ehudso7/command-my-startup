import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supported AI providers
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

// Model information
export interface AIModel {
  id: string;
  provider: AIProvider;
  name: string;
  description: string;
  maxTokens: number;
  training: string;
  capabilities: string[];
  pricingPerToken: number;
  tierRequirement: 'free' | 'standard' | 'pro' | 'enterprise';
}

// Available models configuration
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    provider: AIProvider.OPENAI,
    name: 'GPT-4o',
    description: 'Most capable GPT-4 model, with improved instruction following, knowledge cutoff in 2023',
    maxTokens: 128000,
    training: '2023',
    capabilities: ['text', 'image-understanding', 'code', 'reasoning'],
    pricingPerToken: 0.00005,
    tierRequirement: 'standard',
  },
  {
    id: 'gpt-3.5-turbo',
    provider: AIProvider.OPENAI,
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective model for most general-purpose tasks',
    maxTokens: 16385,
    training: '2023',
    capabilities: ['text', 'code'],
    pricingPerToken: 0.000003,
    tierRequirement: 'free',
  },
  {
    id: 'claude-3-opus-20240229',
    provider: AIProvider.ANTHROPIC,
    name: 'Claude 3 Opus',
    description: 'Most powerful Claude model for complex tasks requiring deep expertise',
    maxTokens: 200000,
    training: '2023',
    capabilities: ['text', 'image-understanding', 'code', 'reasoning'],
    pricingPerToken: 0.00015,
    tierRequirement: 'pro',
  },
  {
    id: 'claude-3-sonnet-20240229',
    provider: AIProvider.ANTHROPIC,
    name: 'Claude 3 Sonnet',
    description: 'Balanced Claude model with excellent capabilities at a lower cost',
    maxTokens: 200000,
    training: '2023',
    capabilities: ['text', 'image-understanding', 'code'],
    pricingPerToken: 0.00003,
    tierRequirement: 'standard',
  },
];

// Message format for AI requests
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

// Common interface for sending messages to all providers
export interface AISendMessageOptions {
  messages: AIMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  functions?: any[]; // Function calling definitions
  functionCall?: 'auto' | 'none' | { name: string };
  user?: string; // For tracking usage
}

// Response interface
export interface AIResponse {
  id: string;
  content: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * Check if user has access to a model based on their subscription tier
 */
export function hasModelAccess(modelId: string, userTier: 'free' | 'standard' | 'pro' | 'enterprise'): boolean {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  if (!model) {
    return false;
  }
  
  const tierLevels = {
    free: 0,
    standard: 1,
    pro: 2,
    enterprise: 3,
  };
  
  const userTierLevel = tierLevels[userTier];
  const requiredTierLevel = tierLevels[model.tierRequirement];
  
  return userTierLevel >= requiredTierLevel;
}

/**
 * Send a message to the specified AI model
 */
export async function sendMessage(options: AISendMessageOptions): Promise<AIResponse> {
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === options.model);
  
  if (!modelInfo) {
    throw new Error(`Model ${options.model} not found`);
  }
  
  try {
    // Call the appropriate provider
    let response: AIResponse;
    
    switch (modelInfo.provider) {
      case AIProvider.OPENAI:
        response = await callOpenAI(options);
        break;
      case AIProvider.ANTHROPIC:
        response = await callAnthropic(options);
        break;
      default:
        throw new Error(`Unsupported provider: ${modelInfo.provider}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Error calling ${modelInfo.provider} API:`, error);
    throw error;
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(options: AISendMessageOptions): Promise<AIResponse> {
  const { messages, model, temperature = 0.7, maxTokens, functions, functionCall, user } = options;
  
  // Map messages to OpenAI format
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.name ? { name: msg.name } : {}),
  }));
  
  // Prepare request parameters
  const requestParams: any = {
    model,
    messages: formattedMessages,
    temperature,
    max_tokens: maxTokens,
    user,
  };
  
  // Add function calling if provided
  if (functions && functions.length > 0) {
    requestParams.functions = functions;
    requestParams.function_call = functionCall;
  }
  
  // Make the API call
  const completion = await openai.chat.completions.create(requestParams);
  
  // Extract function call if present
  const functionCallResult = completion.choices[0].message.function_call
    ? {
        name: completion.choices[0].message.function_call.name,
        arguments: completion.choices[0].message.function_call.arguments,
      }
    : undefined;
  
  return {
    id: completion.id,
    content: completion.choices[0].message.content || '',
    model: completion.model,
    provider: AIProvider.OPENAI,
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
    functionCall: functionCallResult,
  };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(options: AISendMessageOptions): Promise<AIResponse> {
  const { messages, model, temperature = 0.7, maxTokens, user } = options;
  
  // Extract system message (first system message only)
  const systemMessage = messages.find(msg => msg.role === 'system')?.content || '';
  
  // Map remaining messages to Anthropic format (skipping system messages)
  const anthropicMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));
  
  // Make the API call
  const response = await anthropic.messages.create({
    model,
    messages: anthropicMessages,
    system: systemMessage,
    max_tokens: maxTokens || 4000,
    temperature,
    metadata: {
      user_id: user,
    },
  });
  
  return {
    id: response.id,
    content: response.content[0].text,
    model: response.model,
    provider: AIProvider.ANTHROPIC,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
