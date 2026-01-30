/**
 * Gemini Adapter (Infrastructure Layer)
 *
 * This adapter integrates Google Gemini as an external AI dependency,
 * used exclusively for creative and semi-creative generation.
 *
 * It implements the IAIProvider port and acts as a pure translator between
 * the application layer and the Gemini API:
 * - Translates system messages into Gemini-compatible prompts
 * - Executes the AI call using the Google Generative AI SDK
 * - Translates the response back into a backend-friendly format
 * - Computes token usage and energy consumption deterministically
 *
 * IMPORTANT:
 * - Gemini is treated as a probabilistic generator.
 * - It does NOT enforce schemas or domain constraints.
 * - It does NOT make business decisions.
 *
 * Strict JSON and schema enforcement are intentionally handled
 * by a separate OpenAI adapter, dedicated to structure-only transformations.
 * This keeps creative generation and structural validation clearly separated.
 */

import { getModel } from './GeminiConfig.js';
import { IAIProvider } from '../../../domain/ports/IAIProvider.js';

/**
 * Estimate token usage for Gemini responses.
 *
 * This is a deterministic approximation based on the original implementation.
 *
 * Formula:
 *   tokens ≈ text.length / 3.7
 *
 * @param {string} text
 * @returns {number}
 */
function calculateGeminiTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.round(text.length / 3.7);
}

/**
 * Compute energy consumption for a Gemini call.
 *
 * Energy is derived from both prompt and response size,
 * following the original backend formula:
 *
 * 1. promptTokens = calculateGeminiTokens(prompt)
 * 2. responseTokens = calculateGeminiTokens(response)
 * 3. total = responseTokens + (promptTokens × 0.30)
 * 4. energy = ceil(total / 100)
 *
 * @param {string} prompt
 * @param {string} response
 * @returns {number}
 */
function calculateGeminiEnergy(prompt, response) {
  const tokensPrompt = calculateGeminiTokens(prompt);
  const tokensResponse = calculateGeminiTokens(response);
  const totalTokens = Math.round(tokensResponse + (tokensPrompt * 0.30));
  const energy = Math.ceil(totalTokens / 100);

  console.log(
    `📊 [Gemini Energy] Prompt: ${tokensPrompt}t, Response: ${tokensResponse}t, Total: ${totalTokens}t → Energy: ${energy}`
  );

  return energy;
}

/**
 * Gemini adapter implementing the IAIProvider port.
 *
 * This adapter performs no orchestration, validation, or flow control.
 * All decisions about when and why Gemini is called belong to the use case.
 */
export class GeminiAdapter extends IAIProvider {

  /**
   * Universal Gemini call.
   *
   * @param {string} userId - User identifier (used only for logging)
   * @param {Array<Object>} messages - [{ role, content }] prepared by the application layer
   * @param {Object} options
   * @param {string} options.model - Gemini model (default: gemini-2.5-flash)
   * @param {number} options.temperature - Sampling temperature
   * @param {number} options.maxTokens - Output token limit
   * @param {boolean} options.forceJson - Included for interface parity (not used here)
   *
   * @returns {Promise<Object>} { content, model, tokensUsed, energyConsumed }
   */
  async callAI(userId, messages, options = {}) {
    try {
      const {
        model = 'gemini-2.5-flash',
        temperature = 0.7,
        maxTokens = 1500,
        forceJson = false, // intentionally unused
      } = options;

      console.log(`🧠 [Gemini] Calling model: ${model}`);

      const geminiModel = getModel(model);

      // Convert messages to a single Gemini-compatible prompt
      const prompt = messages.map(m => {
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

      // Only Gemini consumes internal energy units (creative generation)
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
      console.error(`❌ [GeminiAdapter] callAI error: ${error.message}`);
      throw new Error(`Gemini call failed: ${error.message}`);
    }
  }

  /**
   * Convenience wrapper when a function type is provided.
   *
   * Model selection is intentionally handled by the use case
   * (via ModelSelectionPolicy), not by this adapter.
   *
   * @param {string} userId
   * @param {Array<Object>} messages
   * @param {string} functionType
   * @returns {Promise<Object>}
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
