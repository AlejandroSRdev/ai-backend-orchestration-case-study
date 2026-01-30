/**
 * Gemini Adapter — Infrastructure Layer
 *
 * Architecture: Hexagonal (Ports & Adapters)
 *
 * This adapter is a concrete implementation of the IAIProvider port
 * for Google Gemini models.
 *
 * Its responsibility is strictly infrastructural:
 * - Translate domain-level AI requests into Gemini SDK calls
 * - Normalize Gemini responses into a provider-agnostic format
 * - Perform token and energy accounting according to predefined rules
 *
 * This adapter deliberately does NOT:
 * - Define prompts or AI flows
 * - Decide which model to use
 * - Apply domain rules or business logic
 *
 * Those responsibilities remain in the application layer
 * (use-cases, policies, and prompt factories).
 */

import { getModel } from './GeminiConfig.js';
import { IAIProvider } from '../../../domain/ports/IAIProvider.js';
import { sanitizeUserInput } from '../../../application/input/SanitizeUserInput.js';

/**
 * Estimate token usage for Gemini models.
 *
 * This is an approximation based on the original production formula:
 *   tokens ≈ text.length / 3.7
 *
 * Token estimation is intentionally isolated to keep provider-specific
 * heuristics out of the domain layer.
 */
function calculateGeminiTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.round(text.length / 3.7);
}

/**
 * Compute energy consumption for a Gemini request.
 *
 * Energy is calculated using the legacy production formula:
 *   energy = ceil((responseTokens + promptTokens × 0.30) / 100)
 *
 * This preserves historical behavior while keeping the logic
 * localized to the provider adapter.
 */
function calculateGeminiEnergy(prompt, response) {
  const tokensPrompt = calculateGeminiTokens(prompt);
  const tokensResponse = calculateGeminiTokens(response);
  const totalTokens = Math.round(tokensResponse + (tokensPrompt * 0.30));
  const energy = Math.ceil(totalTokens / 100);

  console.log(
    `📊 [Gemini Energy] Prompt: ${tokensPrompt}t, ` +
    `Response: ${tokensResponse}t, ` +
    `Total: ${totalTokens}t → Energy: ${energy}`
  );

  return energy;
}

/**
 * Gemini adapter implementing the IAIProvider contract.
 *
 * Acts as the system boundary for all Gemini-specific behavior.
 */
export class GeminiAdapter extends IAIProvider {

  /**
   * Execute a single AI call against a Gemini model.
   *
   * This method assumes:
   * - Prompts have already been constructed upstream
   * - Model selection has already been decided by policies
   *
   * It focuses exclusively on execution and normalization.
   */
  async callAI(userId, messages, options = {}) {
    try {
      const {
        model = 'gemini-2.5-flash',
        temperature = 0.7,
        maxTokens = 1500,
        forceJson = false,
      } = options;

      console.log(`🧠 [Gemini] Calling model: ${model}`);

      const geminiModel = getModel(model);

      /**
       * Sanitize raw user input at the infrastructure boundary.
       * Only user-originated messages are sanitized; system and
       * assistant messages are considered trusted.
       */
      const sanitizedMessages = messages.map(m => {
        if (m.role === 'user') {
          return { ...m, content: sanitizeUserInput(m.content) };
        }
        return m;
      });

      /**
       * Convert generic message format into Gemini-compatible prompt text.
       */
      const prompt = sanitizedMessages.map(m => {
        if (m.role === 'system') return `[SYSTEM INSTRUCTIONS]\n${m.content}`;
        if (m.role === 'assistant') return `[ASSISTANT]\n${m.content}`;
        return m.content;
      }).join('\n\n');

      const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens,
      };

      const result = await geminiModel.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      });

      const content = result.response.text();
      const tokensUsed = calculateGeminiTokens(content);

      /**
       * Only Gemini calls consume internal "energy" units,
       * as they represent creative generation.
       */
      const energyConsumed = calculateGeminiEnergy(prompt, content);

      const response = {
        content,
        model,
        tokensUsed,
        energyConsumed,
      };

      console.log(
        `✅ [Gemini] Response received - Tokens: ${tokensUsed}, Energy: ${energyConsumed}`
      );

      return response;

    } catch (error) {
      console.error(`❌ [GeminiAdapter] callAI failed: ${error.message}`);
      throw new Error(`Gemini provider error: ${error.message}`);
    }
  }

  /**
   * Execute an AI call based on a higher-level function type.
   *
   * Model resolution is intentionally delegated to the application layer.
   * This method exists for compatibility with function-based flows.
   */
  async callAIWithFunctionType(userId, messages, functionType) {
    return this.callAI(userId, messages, {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 1500,
      forceJson: false,
    });
  }
}

export default GeminiAdapter;
