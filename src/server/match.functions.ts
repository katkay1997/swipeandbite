import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NutritionSchema = z.object({
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  cost_usd_low: z.number(),
  cost_usd_high: z.number(),
  notes: z.string().optional(),
});

export type Nutrition = z.infer<typeof NutritionSchema>;

/**
 * Estimate nutrition + rough cost for a meal using Lovable AI.
 * Caches the result on meals.nutrition so subsequent opens are instant + free.
 */
export const estimateMealNutrition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mealId: string }) => z.object({ mealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabase } = context;
      const { data: meal, error } = await supabase
        .from("meals")
        .select("id,name,cuisine,ingredients,nutrition,calories,macros")
        .eq("id", data.mealId)
        .single();
      if (error || !meal) {
        return { nutrition: null, error: "Meal not found" };
      }

    // Return cached if present
    const cached = meal.nutrition as Partial<Nutrition> | null;
    if (cached && typeof cached.calories === "number") {
      return { nutrition: cached as Nutrition, error: null, cached: true };
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { nutrition: null, error: "AI gateway not configured" };
    }

    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    const prompt = `Estimate the nutrition and rough US grocery cost for ONE serving of this dish.\n\nDish: ${meal.name}\nCuisine: ${meal.cuisine ?? "unknown"}\nIngredients (rough quantities for the whole recipe, divide for one serving):\n${JSON.stringify(ingredients).slice(0, 4000)}\n\nReturn realistic estimates. Cost is grocery cost per serving in USD (low–high range).`;

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a nutritionist. Always respond by calling the provided tool." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_nutrition",
                description: "Report estimated nutrition and cost per serving.",
                parameters: {
                  type: "object",
                  properties: {
                    calories: { type: "number", description: "kcal per serving" },
                    protein_g: { type: "number" },
                    carbs_g: { type: "number" },
                    fat_g: { type: "number" },
                    cost_usd_low: { type: "number", description: "Low end of grocery cost per serving in USD" },
                    cost_usd_high: { type: "number", description: "High end of grocery cost per serving in USD" },
                    notes: { type: "string", description: "Brief 1-line caveat about the estimate" },
                  },
                  required: ["calories", "protein_g", "carbs_g", "fat_g", "cost_usd_low", "cost_usd_high"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_nutrition" } },
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) return { nutrition: null, error: "Rate limited, try again shortly" };
        if (aiRes.status === 402) return { nutrition: null, error: "AI credits exhausted" };
        return { nutrition: null, error: `AI error ${aiRes.status}` };
      }

      const json = await aiRes.json();
      const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { nutrition: null, error: "No nutrition returned" };
      const parsed = NutritionSchema.safeParse(JSON.parse(args));
      if (!parsed.success) return { nutrition: null, error: "Invalid nutrition format" };

      // Cache on the meal row (RLS: only admins can update meals; use service role)
      const { createClient } = await import("@supabase/supabase-js");
      const SUPABASE_URL = process.env.SUPABASE_URL!;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await admin.from("meals").update({ nutrition: parsed.data }).eq("id", data.mealId);
      }

      return { nutrition: parsed.data, error: null, cached: false };
    } catch (e) {
      console.error("estimateMealNutrition AI error", e);
      return { nutrition: null, error: e instanceof Error ? e.message : "Unknown error" };
    }
    } catch (outer) {
      console.error("estimateMealNutrition outer error", outer);
      return { nutrition: null, error: outer instanceof Error ? outer.message : "Unknown error" };
    }
  });

/**
 * Find nearby restaurants serving a meal/dish using Tavily search.
 */
export const searchTakeoutNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mealName: string; cuisine?: string; location: string }) =>
    z
      .object({
        mealName: z.string().min(1).max(200),
        cuisine: z.string().max(100).optional(),
        location: z.string().min(2).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    if (!TAVILY_API_KEY) {
      return { results: [], error: "Takeout search not configured" };
    }
    const query = `Best restaurants serving ${data.mealName}${data.cuisine ? ` (${data.cuisine})` : ""} near ${data.location}. Include name, address, and rating if possible.`;
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: "basic",
          max_results: 6,
          include_answer: true,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("Tavily error", res.status, t);
        return { results: [], error: `Search failed (${res.status})` };
      }
      const json = await res.json();
      const results = (json.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
        title: r.title ?? "Restaurant",
        url: r.url ?? "",
        snippet: r.content ?? "",
      }));
      return { results, answer: json.answer ?? null, error: null };
    } catch (e) {
      console.error("searchTakeoutNearby error", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
