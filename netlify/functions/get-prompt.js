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

    const imageUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: "grok-2-vision-latest",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errDetail = data.error?.message || JSON.stringify(data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `xAI Error: ${errDetail}` })
      };
    }

    const generatedPrompt = data.choices[0].message.content;

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
