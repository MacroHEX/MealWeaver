import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IMeal } from "@/lib/db/models/Meal";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import { DAYS_OF_WEEK } from "@/types";

const MODEL = "gemini-2.5-flash-lite";

function buildPrompt(
  meals: { id: string; name: string; type: string; isBreakfast: boolean }[],
  mealsPerDay: 2 | 3
): string {
  const mealLines = meals
    .map((m) => `- id: "${m.id}" | nombre: "${m.name}" | tipo: "${m.type}"${m.isBreakfast ? " | desayuno: true" : ""}`)
    .join("\n");

  const slotsSection =
    mealsPerDay === 3
      ? `Cada día tiene 3 slots: breakfast (desayuno), lunch (almuerzo), dinner (cena).
- breakfast: usar ÚNICAMENTE comidas con "desayuno: true". Si no hay ninguna, omitir el campo breakfast.
- lunch: usar ÚNICAMENTE comidas SIN "desayuno: true". Aplicar la rotación proteica estrictamente.
- dinner: SIEMPRE debe ser el MISMO id que lunch del mismo día (se cocina una vez y se come en almuerzo y cena)`
      : `Cada día tiene 2 slots: lunch (almuerzo), dinner (cena).
- lunch: usar ÚNICAMENTE comidas SIN "desayuno: true". Aplicar la rotación proteica estrictamente.
- dinner: SIEMPRE debe ser el MISMO id que lunch del mismo día`;

  return `Eres un nutricionista experto en dieta proteica. Tu tarea es generar un menú semanal (7 días) usando ÚNICAMENTE las comidas de la lista provista.

COMIDAS DISPONIBLES:
${mealLines}

REGLAS OBLIGATORIAS:
1. Distribución semanal en almuerzo (lunch):
   - 2 a 3 días con tipo "carne_roja"
   - exactamente 2 días con tipo "pollo"
   - 1 a 2 días con tipo "pescado"
   - Los días restantes: cualquier tipo disponible
2. No repetir el mismo id de comida más de 1 vez en toda la semana por slot
3. Máximo 2 días con tipo "arroz" en lunch, máximo 2 con "pasta", máximo 2 con "sopa"

${slotsSection}

DÍAS de la semana (en orden): Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin bloques de código. Formato exacto:
{"days":[{"dayOfWeek":"Monday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Tuesday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Wednesday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Thursday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Friday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Saturday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"},{"dayOfWeek":"Sunday","breakfast":"<id>","lunch":"<id>","dinner":"<id>"}]}

${mealsPerDay === 2 ? 'Omite el campo "breakfast" en todos los días.' : ""}
Usa únicamente ids de la lista anterior. Si no hay suficientes comidas de un tipo, usa lo que haya disponible.`;
}

function extractJson(text: string): string {
  // Strip markdown code blocks if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Find first { and last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export async function generateMenuWithGemini(
  meals: IMeal[],
  mealsPerDay: 2 | 3,
  apiKey: string
): Promise<IDayMenu[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const mealList = meals.map((m) => ({
    id: m._id.toString(),
    name: m.name,
    type: m.type,
    isBreakfast: m.isBreakfast ?? false,
  }));

  const prompt = buildPrompt(mealList, mealsPerDay);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  let parsed: { days: { dayOfWeek: string; breakfast?: string; lunch?: string; dinner?: string }[] };
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("Gemini devolvió una respuesta inválida. Intenta de nuevo.");
  }

  // Validate and clean: only keep days in DAYS_OF_WEEK order, only valid meal IDs
  const validIds = new Set(meals.map((m) => m._id.toString()));

  const days: IDayMenu[] = DAYS_OF_WEEK.map((day) => {
    const found = parsed.days.find((d) => d.dayOfWeek === day);
    const dayMenu: IDayMenu = { dayOfWeek: day };

    if (found?.breakfast && validIds.has(found.breakfast)) {
      dayMenu.breakfast = found.breakfast;
    }
    if (found?.lunch && validIds.has(found.lunch)) {
      dayMenu.lunch = found.lunch;
    }
    if (found?.dinner && validIds.has(found.dinner)) {
      dayMenu.dinner = found.dinner;
    }

    return dayMenu;
  });

  return days;
}