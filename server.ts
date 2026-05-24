import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client to ensure correct environment stability
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("Warning: GEMINI_API_KEY environment variable is not defined in system context.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "PLACEHOLDER_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes
app.post("/api/analyze-sentiment", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Suggestion message text is required." });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Perform a professional academic operations sentiment scan on this university suggestion box entry:
"${message}"`,
      config: {
        systemInstruction: "You are an administrative data auditor AI. Your task is to categorize university suggestions, tips, feedback, and letters into exactly one of three sentiments: 'positive', 'complaint', or 'urgent'.\n\n- 'positive' corresponds to ideas, constructive praise, helpful system optimizations, and supportive recommendations.\n- 'complaint' corresponds to routine grievances regarding academic policies, system UI, facilities, temperature, schedule timing, or general friction.\n- 'urgent' corresponds strictly to immediate safety hazards, harassment, operational threats, server breaches, physical danger, or heavy system outages.\n\nProvide your analysis strictly in JSON with 'sentiment' (one of: positive, complaint, urgent) and 'sentimentReasoning' (a crisp one-sentence explanation under 12 words).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              description: "The primary sentiment group. Must be strictly one of: 'positive', 'complaint', 'urgent'."
            },
            sentimentReasoning: {
              type: Type.STRING,
              description: "A professional summary explaining why this category matches, under 12 words."
            }
          },
          required: ["sentiment", "sentimentReasoning"]
        }
      }
    });

    const rawResponse = response.text ? response.text.trim() : "{}";
    const parsedData = JSON.parse(rawResponse);
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Sentiment Analysis Error:", error);
    // Graceful fallback to prevent user blockage
    return res.json({
      sentiment: "complaint",
      sentimentReasoning: "Standard incoming text input. Default categorization applied on server loss."
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Configure Vite or Serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server connected to Express router middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving compiled static React SPA production assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server actively running on port ${PORT}`);
  });
}

startServer();
