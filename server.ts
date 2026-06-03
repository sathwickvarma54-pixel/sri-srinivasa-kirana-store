import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Helper to reliably extract and parse JSON from the AI response
function extractJson(rawText: string) {
  let text = rawText.trim();
  
  // Extract JSON from markdown blocks if they exist
  if (text.includes("```")) {
    const lines = text.split("\n");
    const jsonLines: string[] = [];
    let inBlock = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inBlock = !inBlock;
        continue;
      }
      if (inBlock) {
        jsonLines.push(line);
      }
    }
    if (jsonLines.length > 0) {
      text = jsonLines.join("\n").trim();
    }
  }
  
  // Fallback to find anything within matching outer curly braces
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(text);
}

// Reusable helper to send standard fetch payload to OpenRouter completions API
async function callOpenRouterWithKey(prompt: string, apiKeyToUse: string): Promise<any> {
  const trimmedKey = apiKeyToUse.trim();
  const authHeader = trimmedKey.startsWith("Bearer ") ? trimmedKey : `Bearer ${trimmedKey}`;

  const payload = {
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
    temperature: 0.1, // Lower temperature secures strict JSON schema compliance
    top_p: 0.95
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ai.studio/build",
      "X-Title": "Sri Srinivasa Kirana & General Store"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw { status: response.status, body: errText };
  }

  const resJson = await response.json();
  const rawText = resJson.choices?.[0]?.message?.content || "";
  try {
    return extractJson(rawText);
  } catch (err) {
    console.error("OpenRouter raw text extraction failed. Raw text output was:", rawText);
    throw new Error("Unable to parse a structured JSON report from OpenRouter model. Please retry.");
  }
}

// Reusable function to fetch chat completions from OpenRouter API
async function callOpenRouter(prompt: string, customApiKey?: string) {
  let openRouterApiKey = (customApiKey && customApiKey.trim() !== "")
    ? customApiKey.trim()
    : (process.env.OPENROUTER_API_KEY || "");

  openRouterApiKey = openRouterApiKey.trim();

  // Log some debug information for connection diagnosis (obscuring key details)
  console.log(`[OpenRouter AI Diagnostics] Resolving key. Source: ${customApiKey ? "User Custom Settings Header" : "System Environment"}. Length: ${openRouterApiKey.length}. Prefix: ${openRouterApiKey.substring(0, 10)}...`);

  if (!openRouterApiKey) {
    throw new Error("OpenRouter API Key is missing. Please configure OPENROUTER_API_KEY in the Environment Secrets panel or in Store Settings.");
  }

  try {
    return await callOpenRouterWithKey(prompt, openRouterApiKey);
  } catch (err: any) {
    const errMsg = err && err.body ? err.body : JSON.stringify(err);
    if (err && err.status === 401) {
      throw new Error(`The OpenRouter API Key is unauthorized, expired, or has insufficient credits. Please verify your billing/key. Details: ${errMsg}`);
    }
    throw new Error(`OpenRouter API error: ${err.status || 500} - ${errMsg}`);
  }
}

// Server-Side OpenRouter Endpoints
app.post("/api/insights/forecast", async (req, res) => {
  try {
    const customApiKey = (req.headers["x-openrouter-api-key"] || req.headers["x-nvidia-api-key"]) as string | undefined;
    const { products, transactions, todayDate } = req.body;

    const prompt = `You are a retail inventory AI for an Indian Kiran store called "Sri Srinivasa Kirana & General Store".

Here is the current stock data:
${JSON.stringify(products, null, 2)}

Here is the last 30 days of transaction data (outward sales):
${JSON.stringify(transactions, null, 2)}

Today's date: ${todayDate}

Task: Analyze sales velocity for each product. Identify the top 10 products most likely to run out in the next 7 days. For each product provide:
1. Product name
2. Current stock
3. Estimated days until stock-out (based on average daily sales/velocity)
4. Recommended reorder quantity
5. Urgency level: HIGH / MEDIUM / LOW
6. Reason for prognosis (specifically mention if sales velocity is high or if stock is below minimum level)

Respond ONLY with a valid minified JSON object containing a "forecasts" key, matching the following format exactly (do not output any surrounding prose, chat commentary or explanation):
{"forecasts": [{"productName": "Product Name", "currentStock": 10, "daysUntilStockOut": 3, "reorderQty": 50, "urgency": "HIGH", "reason": "Reason details..."}]}`;

    const result = await callOpenRouter(prompt, customApiKey);
    res.json(result);
  } catch (error) {
    console.error("OpenRouter Forecast Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI service temporarily unavailable. Please try again." });
  }
});

app.post("/api/insights/expiry", async (req, res) => {
  try {
    const customApiKey = (req.headers["x-openrouter-api-key"] || req.headers["x-nvidia-api-key"]) as string | undefined;
    const { products, todayDate } = req.body;

    const prompt = `You are a retail inventory AI for an Indian Kiran store.

Here are products with expiry dates:
${JSON.stringify(products, null, 2)}

Today's date: ${todayDate}

Task: For each expiring product, recommend the best action to minimize loss. Consider:
- Products expiring in < 7 days: urgent clearance needed
- Products expiring in 7-30 days: discounting or return to supplier
- Products expiring in 30-60 days: monitor closely

Respond ONLY in valid minified JSON matching this format exactly (no pre/post ambient text):
{"expiryRisks": [{"productName": "Product Name", "expiryDate": "YYYY-MM-DD", "daysLeft": 5, "currentStock": 15, "recommendedAction": "Action...", "suggestedDiscount": "20%", "priority": "URGENT"}]}`;

    const result = await callOpenRouter(prompt, customApiKey);
    res.json(result);
  } catch (error) {
    console.error("OpenRouter Expiry Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI service temporarily unavailable. Please try again." });
  }
});

app.post("/api/insights/slow-stock", async (req, res) => {
  try {
    const customApiKey = (req.headers["x-openrouter-api-key"] || req.headers["x-nvidia-api-key"]) as string | undefined;
    const { products, sales30Days } = req.body;

    const prompt = `You are a retail inventory AI for an Indian Kiran store.

Here is the current stock data and their total sold sales in the last 30 days:
Products: ${JSON.stringify(products, null, 2)}
Sales (Outward quantities in 30 days): ${JSON.stringify(sales30Days, null, 2)}

Task: Identify slow-moving products (sold < 20% of current stock in 30 days) and dead stock (zero sales in last 30 days). For each:
1. Label as "DEAD" or "SLOW"
2. Estimated capital locked (currentStock × purchasePrice)
3. Suggested action (discount, bundle offer, return to supplier, discontinue)

Respond ONLY in valid minified JSON matching this format exactly (no surrounding formatting dialogue):
{"slowStock": [{"productName": "Product Name", "label": "DEAD", "salesLast30Days": 0, "currentStock": 20, "capitalLocked": 500, "suggestedAction": "Suggested action details..."}]}`;

    const result = await callOpenRouter(prompt, customApiKey);
    res.json(result);
  } catch (error) {
    console.error("OpenRouter Slow Stock Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI service temporarily unavailable. Please try again." });
  }
});

app.post("/api/insights/health-summary", async (req, res) => {
  try {
    const customApiKey = (req.headers["x-openrouter-api-key"] || req.headers["x-nvidia-api-key"]) as string | undefined;
    const { summaryData } = req.body;

    const prompt = `You are a business analyst AI for an Indian Kiran retail store.

Store data summary:
- Total products: ${summaryData.totalProducts}
- Total stock value: ₹${summaryData.totalStockValue}
- Low stock items: ${summaryData.lowStockItems}
- Items expiring in 30 days: ${summaryData.itemsExpiring30Days}
- Total sales value last 7 days: ₹${summaryData.sales7Days}
- Total sales value last 30 days: ₹${summaryData.sales30Days}
- Top selling category: ${summaryData.topCategory}
- Slow/dead stock items: ${summaryData.slowDeadCount}
- Total capital in slow stock: ₹${summaryData.slowCapital}

Task: Write a brief business health report (5-7 sentences) in simple, engaging English suitable for a small Indian Kiran store owner. Highlight the most important action they should take this week. Be specific, practical, and encouraging. End with one prioritized action item.

Respond ONLY in valid minified JSON matching this format exactly (do not provide markdown text around it):
{"summary": "Friendly summary paragraph here.", "prioritizedAction": "One prioritized actionable item of 15 words or less."}`;

    const result = await callOpenRouter(prompt, customApiKey);
    res.json(result);
  } catch (error) {
    console.error("OpenRouter Health Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI service temporarily unavailable. Please try again." });
  }
});

// Configure Vite middleware or Static files serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sri Srinivasa Kirana & General Store Server is running on port ${PORT}`);
  });
}

setupServer();
