import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key",
  };

  try {
    const userApiKey = req.headers.get("x-gemini-api-key");
    if (!userApiKey) {
      return NextResponse.json({ answer: "⚠️ Please set your API Key in settings." }, { status: 401, headers });
    }

    const { question, context, history } = await req.json();

    const genAI = new GoogleGenerativeAI(userApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- THE BRAIN UPGRADE ---
    // This prompt tells the AI how to behave based on the user's goal.
    const systemPrompt = `
      You are an advanced Context-Aware AI Assistant living inside a website.
      
      Your Goal: Help the user understand the content of the current page.

      --- WEBSITE CONTENT (CONTEXT) ---
      ${context ? context.slice(0, 8000) : "No text found on this page."}
      ---------------------------------

      --- INSTRUCTIONS ---
      1. **Analyze the User's Request:**
         - If they ask for a **Summary**: Provide a concise bulleted list of the main points.
         - If they ask a **Specific Question**: Answer ONLY using the provided context. If the answer isn't there, say "I can't find that info on this page."
         - If they ask for **Code Explanation**: Explain the code snippets found in the context clearly.
      
      2. **Tone & Style:**
         - Be helpful, professional, and concise.
         - Use **Markdown** (bold, bullet points, code blocks) to make the answer easy to read.
         - Do not hallucinate facts not present in the context.
    `;

    const chat = model.startChat({
      history: history || [],
      generationConfig: { maxOutputTokens: 800 }, // Limit length for speed
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\nUSER QUESTION: ${question}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ answer: text }, { status: 200, headers });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ answer: "❌ Error: " + (error.message || "System Error") }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key" } });
}
