import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./src/firebase";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploads as static files
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
app.post("/api/upload", upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
}, (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error during upload." });
});

app.post("/api/suggest-form-fields", async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `You are an expert academic form designer. Generate a logical set of 3-5 form questions for a form titled "${title}" with description "${description}". The form type is "${type}".` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["text", "long-text", "multiple-choice", "rating"] },
                  label: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "type", "label", "required"]
              }
            }
          },
          required: ["fields"]
        }
      }
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (error) {
    console.warn("Gemini suggestion failed:", error.message || error);
    res.json({
      fields: [
        { id: "sug_fallback_1", type: "multiple-choice", label: "Are you satisfied with the content?", required: true, options: ["Yes", "No", "Partially"] },
        { id: "sug_fallback_2", type: "rating", label: "Rate your overall experience", required: true },
        { id: "sug_fallback_3", type: "long-text", label: "What could we improve?", required: false }
      ]
    });
  }
});

app.post("/api/generate-full-form", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }
    
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `You are an expert academic form designer. The user wants to create a form based on this prompt: "${prompt}". Generate a suitable title, description, and a logical set of form questions.` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["text", "long-text", "multiple-choice", "rating"] },
                  label: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "type", "label", "required"]
              }
            }
          },
          required: ["title", "description", "fields"]
        }
      }
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    console.warn("Gemini full form generation failed:", error.message || error);
    
    const errorMessage = error.message || "";
    if (errorMessage.includes("leaked") || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("API key")) {
      console.warn("Gemini API key is invalid or leaked. Returning fallback form.");
    }
    
    // Fallback response for demo purposes so it doesn't just crash entirely
    res.json({
      title: "Generated Form (Fallback)",
      description: "We couldn't reach the AI due to an API key error. Please check your settings. Here is a generic template.",
      fields: [
        { id: "fallback_1", type: "text", label: "Your Name", required: true },
        { id: "fallback_2", type: "long-text", label: "Provide more details based on your request", required: true }
      ]
    });
  }
});

app.post("/api/analyze-sentiment", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Suggestion message text is required." });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    console.warn("Gemini Sentiment Analysis Error:", error.message || error);
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

async function getFormMetadata(formId: string, origin: string) {
  try {
    const docRef = doc(db, "forms", formId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const title = data.title || "FOSSA Form";
      const description = data.description || "Please fill out this form.";
      let imageUrl = data.mediaUrl || "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1200&h=630";
      
      // Handle relative URLs for OG image
      if (imageUrl.startsWith('/')) {
        imageUrl = `${origin}${imageUrl}`;
      }

      return `
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="${origin}/?formId=${formId}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${imageUrl}" />
      `;
    }
  } catch (err) {
    console.error("Error fetching form metadata:", err);
  }
  return `
    <meta property="og:title" content="FOSSA Form" />
    <meta property="og:description" content="Please fill out this FOSSA form." />
    <meta property="og:image" content="https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1200&h=630" />
    <meta name="twitter:card" content="summary_large_image" />
  `;
}

// Configure Vite or Serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Intercept index.html for link previews
    app.use(async (req, res, next) => {
      if (req.url === '/' || req.url.startsWith('/?formId=')) {
        try {
          const formId = req.query.formId as string | undefined;
          let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.url, template);
          
          if (formId) {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const origin = `${protocol}://${req.get('host')}`;
            const metaTags = await getFormMetadata(formId, origin);
            template = template.replace('</head>', `${metaTags}</head>`);
          }
          
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      } else {
        next();
      }
    });

    app.use(vite.middlewares);
    console.log("Vite development server connected to Express router middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', async (req, res) => {
      const formId = req.query.formId as string | undefined;
      let template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      
      if (formId) {
         const protocol = req.headers['x-forwarded-proto'] || req.protocol;
         const origin = `${protocol}://${req.get('host')}`;
         const metaTags = await getFormMetadata(formId, origin);
         template = template.replace('</head>', `${metaTags}</head>`);
      }
      res.send(template);
    });
    console.log("Serving compiled static React SPA production assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server actively running on port ${PORT}`);
  });
}

startServer();
