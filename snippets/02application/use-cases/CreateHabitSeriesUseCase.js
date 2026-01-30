/**
 * Create Habit Series — Application Use Case
 *
 * Layer: Application
 * Architecture: Hexagonal (Ports & Adapters)
 *
 * This use case coordinates the complete process of creating a habit series
 * using AI as a semantic generation tool under explicit business constraints.
 *
 * It acts as the orchestration layer between:
 * - domain policies (plan access, limits, energy)
 * - AI execution (multi-pass generation)
 * - schema validation
 * - persistence and side effects
 *
 * High-level flow:
 * 1. Pre-AI checks (plan, feature access, limits, available energy)
 * 2. AI execution pipeline (creative → structured → schema-enforced)
 * 3. Post-AI validation (schema compliance)
 * 4. Persistence of the resulting series
 * 5. Domain side effects (counters)
 * 6. Return of a domain DTO projection
 *
 * All dependencies are injected via ports to preserve testability
 * and decouple the use case from infrastructure concerns.
 */

import { hasFeatureAccess, getPlan } from '../../../domain/policies/PlanPolicy.js';
import { getModelConfig } from '../../../domain/policies/ModelSelectionPolicy.js';
import { generateAIResponse } from '../../services/AIExecutionService.js';
import { ValidationError, AuthorizationError } from '../errors/index.js';
import { InsufficientEnergyError } from '../../../domain/errors/index.js';

import CreativeHabitSeriesPrompt from '../../prompts/habit_series_prompts/CreativeHabitSeriesPrompt.js';
import StructureHabitSeriesPrompt from '../../prompts/habit_series_prompts/StructureHabitSeriesPrompt.js';
import JsonSchemaHabitSeriesPrompt from '../../prompts/habit_series_prompts/JsonSchemaHabitSeriesPrompt.js';
import { HabitSeries } from '../../../domain/entities/HabitSeries.ts';

/**
 * Expected schema for habit series (AI output structure)
 * Note: AI prompts use Spanish keys; this schema validates AI output.
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
 * Determine effective plan considering trial status
 */
function determineEffectivePlan(user) {
  let effectivePlan = user.plan || 'freemium';
  if (effectivePlan === 'freemium' && user.trial?.activo) {
    effectivePlan = 'trial';
  }
  return effectivePlan;
}

/**
 * Validate that parsed data matches expected schema
 */
function validateSchema(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data is not an object' };
  }

  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { valid: false, error: 'Missing or invalid title' };
  }

  if (typeof data.description !== 'string' || !data.description.trim()) {
    return { valid: false, error: 'Missing or invalid description' };
  }

  if (!Array.isArray(data.actions)) {
    return { valid: false, error: 'actions must be an array' };
  }

  if (data.actions.length < 3 || data.actions.length > 5) {
    return { valid: false, error: 'actions must have between 3 and 5 items' };
  }

  for (let i = 0; i < data.actions.length; i++) {
    const action = data.actions[i];
    if (!action || typeof action !== 'object') {
      return { valid: false, error: `actions[${i}] is not an object` };
    }
    if (typeof action.name !== 'string' || !action.name.trim()) {
      return { valid: false, error: `actions[${i}].name is missing or invalid` };
    }
    if (typeof action.description !== 'string' || !action.description.trim()) {
      return { valid: false, error: `actions[${i}].description is missing or invalid` };
    }
    if (typeof action.difficulty !== 'string' || !action.difficulty.trim()) {
      return { valid: false, error: `actions[${i}].difficulty is missing or invalid` };
    }
  }

  return { valid: true };
}

/**
 * Create a habit series via AI
 *
 * @param {string} userId - User ID
 * @param {Object} payload - Request payload
 * @param {string} payload.language - Language code ('en' | 'es')
 * @param {string} payload.assistantContext - Serialized assistant context
 * @param {Record<string, string>} payload.testData - User test responses
 * @param {Object} payload.difficultyLabels - Difficulty label translations
 * @param {Object} deps - Injected dependencies
 * @returns {Promise<HabitSeriesDTO>} The complete habit series as persisted
 */
export async function createHabitSeries(userId, payload, deps) {
  console.log(`[USE-CASE] [Habit Series] CreateHabitSeries started for user ${userId}`);

  const { userRepository, habitSeriesRepository, energyRepository, aiProvider } = deps;

  // Validate dependencies
  if (!userRepository) {
    throw new ValidationError('Dependency required: userRepository');
  }
  if (!habitSeriesRepository) {
    throw new ValidationError('Dependency required: habitSeriesRepository');
  }
  if (!energyRepository) {
    throw new ValidationError('Dependency required: energyRepository');
  }
  if (!aiProvider) {
    throw new ValidationError('Dependency required: aiProvider');
  }

  // Validate payload
  if (!payload?.language || !payload?.testData) {
    throw new ValidationError('Missing required payload fields: language, testData');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: PRE-AI VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  // 1.1 Load user
  const user = await userRepository.getUser(userId);
  if (!user) {
    throw new ValidationError('USER_NOT_FOUND');
  }

  // 1.2 Determine effective plan
  const effectivePlan = determineEffectivePlan(user);
  const planConfig = getPlan(effectivePlan, user.trial?.activo);

  // 1.3 Validate feature access
  const hasAccess = hasFeatureAccess(effectivePlan, 'habits.series.create');
  if (!hasAccess) {
    throw new AuthorizationError(
      `Plan ${effectivePlan} does not have access to habits.series.create`
    );
  }

  // 1.4 Validate active series limit
  const limits = user.limits || {};
  const activeSeriesCount = limits.activeSeriesCount || 0;
  const maxActiveSeries = planConfig.maxActiveSeries || 0;

  if (activeSeriesCount >= maxActiveSeries) {
    throw new AuthorizationError(
      `Active series limit reached: ${activeSeriesCount}/${maxActiveSeries}`
    );
  }

  // 1.5 Validate energy availability
  const energyData = await energyRepository.getEnergy(userId);
  if (!energyData || energyData.actual <= 0) {
    throw new InsufficientEnergyError(1, energyData?.actual || 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: AI EXECUTION (3 passes)
  // ═══════════════════════════════════════════════════════════════════════

  const { language, assistantContext, testData } = payload;

  // Pass 1: Creative generation (human-readable text)
  const creativeMessages = CreativeHabitSeriesPrompt({
    language,
    assistantContext: assistantContext || '',
    testData
  });

  const creativeConfig = getModelConfig('habit_series_creative');
  const creativeResponse = await generateAIResponse(
    userId,
    creativeMessages,
    {
      model: creativeConfig.model,
      temperature: creativeConfig.temperature,
      maxTokens: creativeConfig.maxTokens,
      forceJson: false
    },
    { aiProvider, energyRepository }
  );

  const rawCreativeText = creativeResponse.content;

  // Pass 2: Structure extraction (text → JSON)
  const structureMessages = StructureHabitSeriesPrompt({
    language,
    rawText: rawCreativeText
  });

  const structureConfig = getModelConfig('habit_series_structure');
  const structureResponse = await generateAIResponse(
    userId,
    structureMessages,
    {
      model: structureConfig.model,
      temperature: structureConfig.temperature,
      maxTokens: structureConfig.maxTokens,
      forceJson: true
    },
    { aiProvider, energyRepository }
  );

  const rawStructuredText = structureResponse.content;

  // Pass 3: Schema enforcement (strict JSON validation)
  const schemaMessages = JsonSchemaHabitSeriesPrompt({
    content: rawStructuredText,
    schema: HABIT_SERIES_SCHEMA
  });

  const schemaConfig = getModelConfig('json_conversion');
  const schemaResponse = await generateAIResponse(
    userId,
    schemaMessages,
    {
      model: schemaConfig.model,
      temperature: schemaConfig.temperature,
      maxTokens: schemaConfig.maxTokens,
      forceJson: true
    },
    { aiProvider, energyRepository }
  );

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: POST-AI VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  let parsedSeries;
  try {
    parsedSeries = typeof schemaResponse.content === 'string'
      ? JSON.parse(schemaResponse.content)
      : schemaResponse.content;
  } catch (parseError) {
    throw new ValidationError(`AI output is not valid JSON: ${parseError.message}`);
  }

  const actionCount = Array.isArray(parsedSeries?.acciones) ? parsedSeries.acciones.length : 0;
  console.log(`[SCHEMA] [Habit Series] Validating AI output against schema, actions=${actionCount}`);

  const schemaValidation = validateSchema(parsedSeries);
  if (!schemaValidation.valid) {
    console.error(`[SCHEMA ERROR] [Habit Series] Schema validation failed: ${schemaValidation.error}`);
    throw new ValidationError(`AI output schema validation failed: ${schemaValidation.error}`);
  }

  console.log('[SCHEMA] [Habit Series] Schema validation OK');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════

  const persistResult = await habitSeriesRepository.createFromAI(userId, parsedSeries);
  const seriesId = persistResult.id;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: SIDE EFFECTS (counter increment)
  // ═══════════════════════════════════════════════════════════════════════

  await userRepository.incrementActiveSeries(userId);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: RETURN FULL HABIT SERIES DTO
  // ═══════════════════════════════════════════════════════════════════════
  // Create domain entity and return its DTO projection.
  // The entity handles mapping AI output to domain model.

  const habitSeries = HabitSeries.fromAIOutput(seriesId, parsedSeries);

  return habitSeries.toDTO();
}

export default { createHabitSeries };