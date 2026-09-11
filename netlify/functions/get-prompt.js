exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image payload provided" })
      };
    }

    const API_KEY = process.env.AI_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Netlify Environment Variable 'AI_API_KEY' not configured." })
      };
    }

    const systemPrompt = `Analyze this vector graphic, icon, or illustration deeply. 
Act as an expert AI prompt engineer. 
Write a complete, single-paragraph MASTER PROMPT so Midjourney, Ideogram, or Imagen can recreate this exact artwork style, subjects, and vector composition.
Include:
- Subject and elements description
- Style details (e.g., flat 2D vector, clean stroke, minimal icon set, rounded corners, SVG aesthetic)
- Colors and backgrounds (isolated on pure white background, solid flat fills, no realistic 3D shading)
Output ONLY the final master prompt text. No markdown, no preface, no labels.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: imageBase64
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${API_KEY.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const errDetail = data.error?.message || JSON.stringify(data);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({ error: `Gemini Error: ${errDetail}` })
      };
    }

    const generatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedPrompt) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No prompt generated from image." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: generatedPrompt.trim() })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Server Error" })
    };
  }
};
