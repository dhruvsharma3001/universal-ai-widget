import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. CORS Headers (Allow connections from any website)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key",
  };

  try {
    // 2. Get the User's API Key from the headers
    const userApiKey = req.headers.get("x-gemini-api-key");

    // CHECK: Did the user actually provide a key?
    if (!userApiKey || userApiKey.trim() === "") {
      return NextResponse.json(
        { answer: "⚠️ Please enter your API Key in the settings first." },
        { status: 401, headers }
      );
    }

    // 3. Initialize Gemini with THEIR key
    const genAI = new GoogleGenerativeAI(userApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. Parse the incoming data
    const body = await req.json();
    const { question, context } = body;

    if (!question || !context) {
       return NextResponse.json(
        { answer: "⚠️ Error: Missing question or page context." },
        { status: 400, headers }
      );
    }

    // 5. Construct the Prompt
    const prompt = `
      You are a helpful assistant reading a webpage.
      USER QUESTION: "${question}"
      WEBSITE CONTEXT:
      """
      ${context.slice(0, 8000)}
      """
      Answer strictly based on the context.
    `;

    // 6. Generate Response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ answer: text }, { status: 200, headers });

  } catch (error: any) {
    console.error("AI Error:", error); // Log the actual error to your terminal
    
    // Handle invalid keys specifically
    if (error.message?.includes("API_KEY_INVALID") || error.status === 400) {
        return NextResponse.json(
            { answer: "❌ Error: Your API Key is invalid. Please check it." },
            { status: 401, headers }
        );
    }

    return NextResponse.json(
      { answer: "❌ System Error: " + (error.message || "Unknown error") },
      { status: 500, headers }
    );
  }
}

// Handle Preflight Requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key",
    },
  });
}