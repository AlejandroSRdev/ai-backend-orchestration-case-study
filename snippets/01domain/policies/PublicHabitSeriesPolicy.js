/**
 * PublicHabitSeriesPolicies (Domain)
 *
 * PURPOSE
 * -------
 * This file exposes a **curated subset of domain policies** related to the
 * `/api/habits/series` endpoint.
 *
 * It is intentionally designed for **public exposure** (portfolio / GitHub),
 * showcasing how business rules and AI decision criteria are modeled in a
 * real-world backend system using Hexagonal Architecture.
 *
 * IMPORTANT
 * ---------
 * - This file is NOT a full representation of the domain.
 * - Sensitive business rules (plans, pricing, energy, monetization) are
 *   deliberately excluded.
 * - The goal is architectural clarity, not feature completeness.
 * - Domain-only rules.
 * - Pure functions, no side effects.
 */

/* ============================================================================
 * SECTION 1 — Habit Series Persistence Policy
 * ============================================================================
 */

/**
 * Determines whether a habit series generation corresponds to a **final**
 * version that should be persisted.
 *
 * Business rationale:
 * -------------------
 * Habit series are generated in multiple passes:
 *
 * 1. Creative pass:
 *    - Exploratory
 *    - High variability
 *    - Used to explore ideas and themes
 *
 * 2. Structural pass:
 *    - Deterministic
 *    - Constrained
 *    - Produces a stable, well-defined structure
 *
 * Only the **structural pass** represents a final artifact that is safe
 * and meaningful to persist.
 *
 * @param functionType - AI function identifier
 * @returns true if the series must be persisted, false otherwise
 */
export function isHabitSeriesFinal(functionType: string): boolean {
  return functionType === 'habit_series_structure';
}

/* ============================================================================
 * SECTION 2 — AI Pass Selection Policy (Restricted Public Subset)
 * ============================================================================
 */

/**
 * This is a **restricted and intentionally incomplete** subset of the internal
 * AI model selection policy.
 *
 * Only the policies strictly required to understand the habit series pipeline
 * are exposed.
 *
 * The real system contains additional mappings and rules that are NOT public.
 */
export const HABIT_SERIES_AI_POLICIES = {
  /**
   * Creative pass for habit series generation.
   *
   * Purpose:
   * - Explore themes
   * - Generate diverse habit ideas
   * - Allow creative freedom
   *
   * Characteristics:
   * - Higher temperature
   * - Non-deterministic
   */
  habit_series_creative: {
    model: 'gemini-2.5-flash',
    temperature: 0.8,
    maxTokens: 1500,
    description: 'Habit series creative exploration pass'
  },

  /**
   * Structural pass for habit series generation.
   *
   * Purpose:
   * - Enforce structure and coherence
   * - Produce a stable, final representation
   *
   * Characteristics:
   * - Zero temperature
   * - Deterministic output
   */
  habit_series_structure: {
    model: 'gemini-2.5-pro',
    temperature: 0.0,
    maxTokens: 1500,
    description: 'Habit series structural consolidation pass'
  },

  /**
   * JSON normalization pass.
   *
   * Purpose:
   * - Convert free-form AI output into a strict JSON contract
   * - Guarantee schema compliance
   *
   * This pass is intentionally separated from creative reasoning to ensure
   * that structured data generation remains deterministic and safe.
   */
  json_conversion: {
    model: 'gpt-4o-mini',
    temperature: 0.0,
    maxTokens: 1500,
    forceJson: true,
    description: 'Strict text-to-JSON normalization pass'
  }
} as const;

/**
 * Retrieve AI configuration for the exposed habit series passes.
 *
 * This helper is intentionally limited in scope and does NOT allow access
 * to the full internal model catalog.
 *
 * @param functionType - One of the exposed habit series function types
 * @returns AI configuration for the given pass
 */
export function getHabitSeriesAIConfig(functionType: keyof typeof HABIT_SERIES_AI_POLICIES) {
  return HABIT_SERIES_AI_POLICIES[functionType];
}

/* ============================================================================
 * SECTION 3 — Business Plan Policies (Not Exposed)
 * ============================================================================
 */

/**
 * NOTE ON BUSINESS RULES
 * ---------------------
 * The real system contains additional domain policies responsible for:
 *
 * - Subscription plans
 * - Trial rules
 * - Energy consumption limits
 * - Feature access control
 * - Monetization and billing constraints
 *
 * These policies:
 * - Exist in the domain layer
 * - Are pure business rules
 * - Are intentionally NOT exposed in public repositories
 *
 * Reason:
 * --------
 * They represent strategic and commercial logic rather than architectural
 * examples.
 *
 * This separation is deliberate and reflects professional boundary-setting
 * between technical design and business confidentiality.
 */
