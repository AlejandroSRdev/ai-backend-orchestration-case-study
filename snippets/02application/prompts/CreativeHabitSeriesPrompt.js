import { Difficulty } from '../../../domain/value_objects/habit_objects/Difficulty.ts';

/**
 * FIRST PASS — Creative Semantic Generation
 *
 * This prompt is responsible ONLY for generating free-form,
 * human-readable content (NOT JSON).
 *
 * It deliberately avoids:
 * - domain decisions
 * - scoring
 * - ranking
 * - persistence
 * - schema enforcement
 *
 * Its sole responsibility is semantic generation under strict constraints.
 * All critical validation and structure are enforced downstream
 * by the backend (use-case, policies, schema validation).
 *
 * Difficulty values are sourced directly from the domain
 * to prevent drift between AI output and business rules.
 */

/**
 * @param {Object} params
 * @param {string} params.language - 'en' | 'es'
 * @param {string} params.assistantContext - Serialized assistant context (optional)
 * @param {Record<string, string>} params.testData - User test responses
 *
 * @returns {Array<{role: string, content: string}>}
 * A message array to be consumed by the AI adapter.
 *
 * NOTE:
 * The output of this prompt is intentionally unstructured text.
 * It will be parsed, validated, and normalized in subsequent steps.
 */
function CreativeHabitSeriesPrompt({
  language,
  assistantContext,
  testData
}) {
  const dificultadBaja = Difficulty.LOW;
  const dificultadMedia = Difficulty.MEDIUM;
  const dificultadAlta = Difficulty.HIGH;

  /**
   * Optional contextual background.
   * This context is provided strictly as reference material
   * and must not be replied to or echoed by the model.
   */
  const contextSection = assistantContext?.trim()
    ? `\n\n---\nBACKGROUND CONTEXT (for reference only, do not reply to this):\n${assistantContext}\n---\n`
    : '';

  /**
   * SYSTEM PROMPT
   *
   * Enforces:
   * - language determinism
   * - output boundaries
   * - formatting limits
   * - explicit exclusion of JSON or structural guarantees
   *
   * Creativity is allowed ONLY inside predefined constraints.
   */
  const systemPrompt = language === 'en'
    ? `LANGUAGE CONSTRAINT (MANDATORY): You MUST generate ALL content in ENGLISH. This is non-negotiable.

You are Arvi. Create ONE complete thematic habit series based on the user's test responses.
${contextSection}
FORMAT RULES (VERY STRICT):
- ONE title only.
- ONE explanatory description, max **10 lines** (≈120–180 words).
- Between **3 and 5 actions**.
- Each action must have:
  • A short action name
  • One description of max **5 lines**
  • A difficulty: "${dificultadBaja}" (easy/quick), "${dificultadMedia}" (moderate effort), or "${dificultadAlta}" (challenging/demanding)
- NO lists outside the action list.
- NO intros ("Here is your series"), NO conclusions.
- ONLY the content of the series.

CONTENT RULES:
The series must:
- Reflect the user's test answers.
- Follow neuroscientific and consistency principles.
- Progress logically from easier to harder.
- Remain practical, personalized and realistic.

Your output must be a clean, structured description, but NOT JSON.
Just produce the text, respecting the limits.
ALL OUTPUT MUST BE IN ENGLISH.`
    : `RESTRICCIÓN DE IDIOMA (OBLIGATORIO): DEBES generar TODO el contenido en ESPAÑOL. Esto es innegociable.

Eres Arvi. Crea UNA serie temática de hábitos completa.
${contextSection}
REGLAS DE FORMATO (MUY ESTRICTAS):
- SOLO un título.
- SOLO una descripción explicativa de la serie, máximo **10 líneas** (≈120–180 palabras).
- Entre **3 y 5 acciones**.
- Cada acción debe incluir:
  • Un nombre corto
  • Una descripción de máximo **5 líneas**
  • Una dificultad: "${dificultadBaja}" (fácil/rápida), "${dificultadMedia}" (esfuerzo moderado), o "${dificultadAlta}" (exigente/desafiante)
- SIN intros del tipo ("Aquí tienes la serie"), SIN cierres formales.
- SIN listas externas que no sean las acciones.
- SOLO el contenido de la serie.

REGLAS DE CONTENIDO:
La serie debe:
- Reflejar las respuestas del test del usuario.
- Basarse en principios de constancia y neurociencia.
- Mantener una progresión natural de dificultad.
- Ser práctica, personalizada y realista.

Tu salida debe ser texto limpio, estructurado y limitado.
NO es JSON aún.
TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL.`;

  /**
   * USER PROMPT
   *
   * Raw test data is flattened and passed as input context.
   * No interpretation or validation occurs at this stage.
   */
  const userPrompt = language === 'en'
    ? `Test data: ${Object.entries(testData).map(([k, v]) => `${k}: ${v}`).join("; ")}`
    : `Datos del test: ${Object.entries(testData).map(([k, v]) => `${k}: ${v}`).join("; ")}`;

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}

export default CreativeHabitSeriesPrompt;