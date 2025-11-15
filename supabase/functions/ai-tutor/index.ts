
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  question?: string;
  content?: string;
  fileName?: string;
  type: "question" | "document";
}

// Technical terms knowledge base
const technicalTerms: Record<string, string> = {
  "algorithm": "An algorithm is a step-by-step procedure or formula for solving a problem. Think of it like a recipe - it's a set of instructions that, when followed in order, will help you achieve a specific goal. For example, a sorting algorithm arranges data in a particular order.",
  
  "variable": "A variable is a container that stores data values in programming. It's like a labeled box where you can put information and retrieve it later. Variables can hold different types of data like numbers, text, or true/false values.",
  
  "function": "A function is a reusable block of code that performs a specific task. It's like a mini-program within your program. You can call a function whenever you need to perform that task, which helps keep your code organized and reduces repetition.",
  
  "loop": "A loop is a programming structure that repeats a set of instructions multiple times. It's useful when you need to do the same thing over and over. Common types include 'for loops' (repeat a specific number of times) and 'while loops' (repeat until a condition is met).",
  
  "array": "An array is a data structure that stores multiple values in a single variable. Think of it as a list or collection of items. For example, an array could store a list of student names or test scores.",
  
  "object": "An object is a collection of related data and functions grouped together. It's like a container that holds both information (properties) and actions (methods). For example, a 'student' object might have properties like name and age, and methods like 'study' or 'takeExam'.",
  
  "class": "A class is a blueprint for creating objects. It defines what properties and methods objects of that type will have. Think of it like a cookie cutter - the class is the cutter, and the objects are the cookies you make with it.",
  
  "database": "A database is an organized collection of data stored electronically. It's like a digital filing cabinet where information is stored in tables (like spreadsheets) and can be easily searched, updated, and managed.",
  
  "api": "API stands for Application Programming Interface. It's a set of rules that allows different software applications to communicate with each other. Think of it as a waiter in a restaurant - it takes your request, tells the kitchen, and brings back what you ordered.",
  
  "debugging": "Debugging is the process of finding and fixing errors (bugs) in your code. It's like being a detective - you investigate why your program isn't working correctly and then fix the problem.",
};

// Study tips
const studyTips = [
  "Break down complex topics into smaller, manageable chunks. This makes learning less overwhelming and helps you understand each part thoroughly.",
  
  "Use the Pomodoro Technique: Study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.",
  
  "Practice active recall by testing yourself regularly. Don't just re-read notes - try to remember information without looking.",
  
  "Teach concepts to someone else (or even to yourself out loud). If you can explain it clearly, you truly understand it.",
  
  "Create visual aids like mind maps, diagrams, or flowcharts. Visual representations help you see connections between concepts.",
];

// Greeting responses
const greetings = [
  "Hello! I'm your AI Study Tutor. How can I help you with your studies today?",
  "Hi there! Ready to learn something new? Ask me anything!",
  "Hey! I'm here to help you understand difficult concepts. What would you like to learn about?",
  "Greetings! Let's make learning easier together. What can I help you with?",
  "Hello! Whether you need explanations, study tips, or practice questions, I'm here to help!",
];

// Fallback response generator
function generateFallbackResponse(question: string): string {
  const lowerQuestion = question.toLowerCase().trim();
  
  // Check for greetings
  const greetingWords = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  if (greetingWords.some(word => lowerQuestion.startsWith(word) || lowerQuestion === word)) {
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Check for "how are you" type questions
  if (lowerQuestion.includes('how are you') || lowerQuestion.includes('how r u')) {
    return "I'm doing great, thank you for asking! I'm here and ready to help you with your studies. What would you like to learn about today?";
  }
  
  // Check for study tips request
  if (lowerQuestion.includes('study tip') || lowerQuestion.includes('how to study') || lowerQuestion.includes('study better')) {
    return studyTips[Math.floor(Math.random() * studyTips.length)];
  }
  
  // Check for technical terms
  for (const [term, definition] of Object.entries(technicalTerms)) {
    if (lowerQuestion.includes(term)) {
      return `Great question about **${term}**!\n\n${definition}\n\nWould you like me to explain anything else related to this concept?`;
    }
  }
  
  // Check for "explain" requests
  if (lowerQuestion.includes('explain') || lowerQuestion.includes('what is') || lowerQuestion.includes('what are')) {
    const topic = lowerQuestion
      .replace(/explain|what is|what are|please|can you|could you|tell me about/gi, '')
      .trim();
    
    if (topic.length > 2) {
      return `I'd be happy to explain ${topic}!\n\nWhile I can provide general guidance, for the most accurate and detailed explanation, I recommend:\n\n1. Breaking down the concept into smaller parts\n2. Looking for examples and analogies\n3. Practicing with hands-on exercises\n4. Connecting it to concepts you already know\n\nIs there a specific aspect of ${topic} you'd like to focus on?`;
    }
  }
  
  // Check for programming help
  if (lowerQuestion.includes('code') || lowerQuestion.includes('program') || lowerQuestion.includes('debug')) {
    return "Programming questions are great! Here's my advice:\n\n• Break the problem into smaller steps\n• Write pseudocode first to plan your logic\n• Test your code with simple examples\n• Use console.log() or print statements to debug\n• Read error messages carefully - they often tell you exactly what's wrong\n\nWhat specific programming concept would you like help with?";
  }
  
  // Default helpful response
  return "That's an interesting question! While I can provide general study guidance, here are some ways I can help you:\n\n• **Explain technical terms** - Ask me about programming concepts, algorithms, data structures, etc.\n• **Study tips** - I can share effective learning strategies\n• **Practice questions** - I can give you questions to test your knowledge\n• **General guidance** - I can help you approach problems systematically\n\nTry asking me to explain a specific concept, or ask for study tips!";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 AI Tutor function invoked");

    // Parse request body
    const body: RequestBody = await req.json();
    const { question, content, fileName, type } = body;

    console.log("📝 Request type:", type);

    if (!type || (type !== "question" && type !== "document")) {
      return new Response(
        JSON.stringify({ response: "Invalid request type. Please specify 'question' or 'document'." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if API key is available
    if (!OPENROUTER_API_KEY) {
      console.log("⚠️ No OPENROUTER_API_KEY - using intelligent fallback response system");
      
      if (type === "question") {
        const fallbackResponse = generateFallbackResponse(question || "");
        return new Response(
          JSON.stringify({ response: fallbackResponse }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        // Fallback for document processing
        const words = (content || "").split(/\s+/);
        const sentences = (content || "").split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        return new Response(
          JSON.stringify({
            summary: sentences.slice(0, 3).join('. ') + '.',
            keyPoints: [
              "This document contains important information for your studies.",
              `The document has approximately ${words.length} words and covers key concepts.`,
              "Review the content carefully and take notes on main ideas.",
              "Try to identify the main themes and supporting details.",
              "Consider creating your own summary to test your understanding.",
            ],
            quiz: [
              {
                id: "q1",
                question: "What is the main topic of this document?",
                options: [
                  "Review the document to identify the main topic",
                  "Look for repeated themes and concepts",
                  "Check the introduction and conclusion",
                  "All of the above"
                ],
                correctAnswer: 3,
                explanation: "To identify the main topic, you should review the entire document, look for repeated themes, and pay special attention to the introduction and conclusion where main ideas are often stated."
              }
            ]
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    let responseData: any = {};

    if (type === "question") {
      if (!question || question.trim().length < 1) {
        return new Response(
          JSON.stringify({ response: "Please ask me a question! I'm here to help you learn." }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("❓ Processing question:", question.substring(0, 50) + "...");

      const prompt = `You are an expert AI tutor helping students learn. Provide a clear, step-by-step explanation to the following question. Be encouraging and educational.

Question: ${question}

Please provide:
1. A clear, detailed explanation
2. Step-by-step breakdown if applicable
3. Examples to illustrate the concept
4. Tips for better understanding

Keep your response conversational and encouraging.`;

      try {
        // Call OpenRouter API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

        console.log("🔄 Calling OpenRouter API...");

        const openRouterResponse = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://student-buddy.app",
            "X-Title": "Student Buddy AI Tutor",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          console.error("❌ OpenRouter API error:", openRouterResponse.status, errorText);
          throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
        }

        const openRouterData = await openRouterResponse.json();
        console.log("✅ OpenRouter response received");

        const aiResponse = openRouterData?.choices?.[0]?.message?.content;
        
        if (!aiResponse || aiResponse.trim().length === 0) {
          console.log("⚠️ Empty OpenRouter response - using fallback");
          const fallbackResponse = generateFallbackResponse(question);
          responseData = { response: fallbackResponse };
        } else {
          responseData = { response: aiResponse };
        }
      } catch (apiError: any) {
        console.error("❌ Error calling OpenRouter API - using fallback:", apiError.message);
        const fallbackResponse = generateFallbackResponse(question);
        responseData = { response: fallbackResponse };
      }

    } else if (type === "document") {
      if (!content || content.trim().length < 10) {
        return new Response(
          JSON.stringify({ response: "The document content is too short or empty. Please upload a valid document." }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("📄 Processing document:", fileName || "unknown");

      const maxContentLength = 30000;
      const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + "... [content truncated]"
        : content;

      const prompt = `You are an expert AI tutor analyzing educational content. Analyze the following document and provide:

1. A comprehensive summary (2-3 paragraphs)
2. 5-7 key points or takeaways
3. 5 multiple-choice quiz questions with explanations

Document: ${fileName || "Uploaded Document"}

Content:
${truncatedContent}

Please respond in the following JSON format:
{
  "summary": "A comprehensive summary of the document",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "quiz": [
    {
      "id": "q1",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer"
    }
  ]
}

Make sure the quiz questions test understanding of the key concepts from the document.`;

      try {
        // Call OpenRouter API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for documents

        console.log("🔄 Calling OpenRouter API for document analysis...");

        const openRouterResponse = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://student-buddy.app",
            "X-Title": "Student Buddy AI Tutor",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          console.error("❌ OpenRouter API error:", openRouterResponse.status, errorText);
          throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
        }

        const openRouterData = await openRouterResponse.json();
        console.log("✅ OpenRouter response received for document");

        const aiResponse = openRouterData?.choices?.[0]?.message?.content || "";

        // Try to parse JSON from the response
        try {
          let jsonText = aiResponse;
          const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          } else {
            const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
              jsonText = jsonObjectMatch[0];
            }
          }

          const parsedResponse = JSON.parse(jsonText);
          
          if (!parsedResponse.summary || !Array.isArray(parsedResponse.keyPoints) || !Array.isArray(parsedResponse.quiz)) {
            throw new Error("Invalid response structure");
          }

          responseData = parsedResponse;
        } catch (parseError) {
          console.error("❌ Failed to parse AI response - using fallback");
          throw parseError;
        }
      } catch (apiError: any) {
        console.error("❌ Error with OpenRouter API - using fallback document analysis:", apiError.message);
        
        // Fallback document analysis
        const words = content.split(/\s+/);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        responseData = {
          summary: sentences.slice(0, 3).join('. ') + '.',
          keyPoints: [
            "This document contains important information for your studies.",
            `The document has approximately ${words.length} words and covers key concepts.`,
            "Review the content carefully and take notes on main ideas.",
            "Try to identify the main themes and supporting details.",
            "Consider creating your own summary to test your understanding.",
          ],
          quiz: [
            {
              id: "q1",
              question: "What is the main topic of this document?",
              options: [
                "Review the document to identify the main topic",
                "Look for repeated themes and concepts",
                "Check the introduction and conclusion",
                "All of the above"
              ],
              correctAnswer: 3,
              explanation: "To identify the main topic, you should review the entire document, look for repeated themes, and pay special attention to the introduction and conclusion where main ideas are often stated."
            },
            {
              id: "q2",
              question: "What study strategy would be most effective for this material?",
              options: [
                "Read it once quickly",
                "Take detailed notes and create summaries",
                "Memorize every word",
                "Skip the difficult parts"
              ],
              correctAnswer: 1,
              explanation: "Taking detailed notes and creating summaries helps you process and understand the material deeply. This active learning approach is much more effective than passive reading or memorization."
            },
            {
              id: "q3",
              question: "How can you best retain information from this document?",
              options: [
                "Review it multiple times over several days",
                "Read it once and never look at it again",
                "Only focus on the first paragraph",
                "Wait until the night before the exam"
              ],
              correctAnswer: 0,
              explanation: "Spaced repetition - reviewing material multiple times over several days - is one of the most effective learning techniques. It helps move information from short-term to long-term memory."
            },
          ]
        };
      }
    }

    console.log("✅ Response prepared successfully");

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    
    // Even on unexpected errors, try to provide a helpful fallback
    const fallbackMessage = "I'm here to help you learn! While I'm experiencing some technical difficulties, I can still assist you with:\n\n• Explaining technical terms and concepts\n• Providing study tips and strategies\n• Answering general questions\n\nPlease try asking your question again, or ask me about a specific topic!";
    
    return new Response(
      JSON.stringify({
        response: fallbackMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
