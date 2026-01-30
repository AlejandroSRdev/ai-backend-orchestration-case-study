/**
 * AI Provider Router — Infrastructure Layer
 *
 * Architecture: Hexagonal (Ports & Adapters)
 *
 * This component acts as a routing adapter between the application layer
 * and multiple AI providers.
 *
 * Its role is to:
 * - Implement the IAIProvider port
 * - Resolve the correct concrete adapter based on the requested model
 * - Delegate execution without leaking provider-specific details upstream
 *
 * This allows the system to:
 * - Support multiple AI providers transparently (Gemini, OpenAI, etc.)
 * - Avoid conditional logic scattered across use-cases
 * - Centralize provider selection and fail fast on unsupported models
 *
 * Model routing strategy:
 * - 'gpt-*' or 'o1-*'    → OpenAIAdapter
 * - 'gemini-*'           → GeminiAdapter
 *
 * Unknown model prefixes result in an explicit error.
 */

import { GeminiAdapter } from './gemini/GeminiAdapter.js';
import { OpenAIAdapter } from './openai/OpenAIAdapter.js';
import { IAIProvider } from '../../domain/ports/IAIProvider.js';

/**
 * Concrete router implementing the IAIProvider port.
 * Internally delegates calls to the appropriate provider adapter.
 */
export class AIProviderRouter extends IAIProvider {
  constructor() {
    super();
    this.geminiAdapter = new GeminiAdapter();
    this.openaiAdapter = new OpenAIAdapter();
  }

  /**
   * Resolves the appropriate AI adapter based on the model identifier.
   *
   * This method centralizes provider selection logic and enforces
   * explicit handling of supported model families.
   */
  getAdapterForModel(model) {
    if (!model || typeof model !== 'string') {
      throw new Error('INVALID_MODEL: Model name is required');
    }

    // OpenAI models
    if (model.startsWith('gpt-') || model.startsWith('o1-')) {
      console.log(`🔀 [AIRouter] Routing to OpenAIAdapter for model: ${model}`);
      return this.openaiAdapter;
    }

    // Gemini models
    if (model.startsWith('gemini-')) {
      console.log(`🔀 [AIRouter] Routing to GeminiAdapter for model: ${model}`);
      return this.geminiAdapter;
    }

    // Fail-fast on unknown model families
    throw new Error(
      `UNKNOWN_MODEL_PROVIDER: No adapter configured for model "${model}". ` +
      `Expected prefix: 'gpt-', 'o1-', or 'gemini-'`
    );
  }

  /**
   * Routes a standard AI call to the appropriate provider adapter.
   *
   * The router itself remains agnostic of prompt semantics,
   * energy accounting, or domain rules.
   */
  async callAI(userId, messages, options = {}) {
    const { model = 'gemini-2.5-flash' } = options;
    const adapter = this.getAdapterForModel(model);
    return adapter.callAI(userId, messages, options);
  }

  /**
   * Routes an AI call associated with a higher-level function type.
   *
   * Note:
   * - The router does not decide which model to use for a given function.
   * - Model selection remains a responsibility of the application layer.
   *
   * This method exists to preserve compatibility with function-oriented calls
   * while keeping provider resolution centralized.
   */
  async callAIWithFunctionType(userId, messages, functionType) {
    // Default delegation to Gemini for function-type calls.
    // Actual model selection is handled upstream.
    return this.geminiAdapter.callAIWithFunctionType(userId, messages, functionType);
  }
}

export default AIProviderRouter;