/**
 * ⚠️ CONTEXT NOTE — CASE STUDY VS PRODUCTION IMPLEMENTATION
 * ------------------------------------------------------------
 * This use case represents a DELIBERATELY SIMPLIFIED version of the
 * production flow, extracted as a case study to highlight the core
 * orchestration logic between backend and AI.
 *
 * In the real production system, this same flow is executed with
 * additional layers that are intentionally omitted here:
 *
 * - Authentication and identity resolution (JWT, middleware)
 * - Full domain rule enforcement (plans, limits, energy, feature flags)
 * - DTO mapping handled at infrastructure boundaries
 * - Observability, logging and deployment concerns
 *
 * Those elements are NOT absent by omission, but by design.
 *
 * The goal of this file is to emphasize:
 * - how AI is treated as an untrusted external dependency
 * - how multi-pass AI generation is governed by the application layer
 * - how defensive validation protects the domain before persistence
 * - how the flow remains deterministic despite probabilistic models
 *
 * This makes the orchestration easier to read, reason about and discuss
 * without the noise of production-specific infrastructure concerns.
 *
 * In short:
 * - This file optimizes for clarity and understanding.
 * - The production system optimizes for correctness and survival.
 *
 * Both share the same conceptual flow.
 */

import { getModelConfig } from '../../../domain/policies/ModelSelectionPolicy.js';
import { generateAIResponse } from '../../services/AIExecutionService.js';
import { ValidationError } from '../errors/index.js';

import CreativeHabitSeriesPrompt from '../../prompts/habit_series_prompts/CreativeHabitSeriesPrompt.js';
import StructureHabitSeriesPrompt from '../../prompts/habit_series_prompts/StructureHabitSeriesPrompt.js';
import JsonSchemaHabitSeriesPrompt from '../../prompts/habit_series_prompts/JsonSchemaHabitSeriesPrompt.js';
import { HabitSeries } from '../../../domain/entities/HabitSeries.js';

/**
 * Schema-like structure used ONLY to guide AI generation.
 * This is NOT a runtime-enforced JSON Schema.
 */
const HABIT_SERIES_SCHEMA = {
  type: 'object',
  required: ['title', 'description', 'actions'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    actions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        required: ['name', 'description', 'difficulty'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string' }
        }
      }
    }
  }
};

/**
 * Manual defensive validation of AI output.
 * This acts as the runtime contract for the use case.
 */
function validateAIOutput(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Output is not an object' };
  }

  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { valid: false, error: 'Invalid or missing title' };
  }

  if (typeof data.description !== 'string' || !data.description.trim()) {
    return { valid: false, error: 'Invalid or missing description' };
  }

  if (!Array.isArray(data.actions)) {
    return { valid: false, error: 'actions must be an array' };
  }

  if (data.actions.length < 3 || data.actions.length > 5) {
    return { valid: false, error: 'actions length out of bounds' };
  }

  for (let i = 0; i < data.actions.length; i++) {
    const action = data.actions[i];
    if (!action || typeof action !== 'object') {
      return { valid: false, error: `actions[${i}] is not an object` };
    }
    if (typeof action.name !== 'string' || !action.name.trim()) {
      return { valid: false, error: `actions[${i}].name invalid` };
    }
    if (typeof action.description !== 'string' || !action.description.trim()) {
      return { valid: false, error: `actions[${i}].description invalid` };
    }
    if (typeof action.difficulty !== 'string' || !action.difficulty.trim()) {
      return { valid: false, error: `actions[${i}].difficulty invalid` };
    }
  }

  return { valid: true };
}

export async function createHabitSeries(userId, payload, deps) {
  console.log(`[USE-CASE] CreateHabitSeries started for user ${userId}`);

  const { userRepository, habitSeriesRepository, energyRepository, aiProvider } = deps;

  if (!userRepository || !habitSeriesRepository || !energyRepository || !aiProvider) {
    throw new ValidationError('Missing required dependencies');
  }

  if (!payload?.language || !payload?.testData) {
    throw new ValidationError('Missing required payload fields');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: DOMAIN VALIDATION (ABSTRACTED)
  // ═══════════════════════════════════════════════════════════════════════
  // At this point, the domain decides WHETHER the operation is allowed
  // (plan, limits, energy, feature access, etc.).
  // Concrete business rules are intentionally omitted in this case study.

  console.log('[DOMAIN] Validation passed (abstracted)');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: AI EXECUTION (3 PASSES)
  // ═══════════════════════════════════════════════════════════════════════

  const { language, assistantContext, testData } = payload;

  // Pass 1 — Creative
  const creativeMessages = CreativeHabitSeriesPrompt({
    language,
    assistantContext: assistantContext || '',
    testData
  });

  const creativeConfig = getModelConfig('habit_series_creative');
  const creativeResponse = await generateAIResponse(
    userId,
    creativeMessages,
    creativeConfig,
    { aiProvider, energyRepository }
  );

  // Pass 2 — Structure
  const structureMessages = StructureHabitSeriesPrompt({
    language,
    rawText: creativeResponse.content
  });

  const structureConfig = getModelConfig('habit_series_structure');
  const structureResponse = await generateAIResponse(
    userId,
    structureMessages,
    structureConfig,
    { aiProvider, energyRepository }
  );

  // Pass 3 — Schema-guided normalization
  const schemaMessages = JsonSchemaHabitSeriesPrompt({
    content: structureResponse.content,
    schema: HABIT_SERIES_SCHEMA
  });

  const schemaConfig = getModelConfig('json_conversion');
  const schemaResponse = await generateAIResponse(
    userId,
    schemaMessages,
    schemaConfig,
    { aiProvider, energyRepository }
  );

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: POST-AI DEFENSIVE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  let parsed;
  try {
    parsed = typeof schemaResponse.content === 'string'
      ? JSON.parse(schemaResponse.content)
      : schemaResponse.content;
  } catch (err) {
    throw new ValidationError('AI output is not valid JSON');
  }

  const validation = validateAIOutput(parsed);
  if (!validation.valid) {
    throw new ValidationError(`AI output validation failed: ${validation.error}`);
  }

  console.log('[CONTRACT] AI output validated');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════

  const entity = HabitSeries.fromAIOutput(parsed);
  const persisted = await habitSeriesRepository.createFromAI(userId, entity);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: DOMAIN SIDE EFFECTS
  // ═══════════════════════════════════════════════════════════════════════

  await userRepository.incrementActiveSeries(userId);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: RETURN RESULT
  // ═══════════════════════════════════════════════════════════════════════

  return persisted.toDTO();
}

export default { createHabitSeries };