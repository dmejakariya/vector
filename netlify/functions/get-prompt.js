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

    const systemPrompt = `Analyze this vector graphic, icon, or illustration in extreme detail. 
Act as an elite reverse-prompt engineer specializing in generative vector graphics.
Generate a single, comprehensive MASTER PROMPT so that AI image generators (Midjourney, Ideogram, Imagen, Leonardo) can recreate the exact same vector art style, line weights, color scheme, and composition.

Requirements to include in output:
- Exact subject description and composition
- Specific art style (e.g. flat 2D vector, clean stroke, minimal glyph icon, SVG aesthetic, Adobe Illustrator vector art)
- Exact color scheme details (e.g. solid black on white, pastel tones, clean flat fills)
- Rules: isolated on pure white background, sharp edges, no realistic 3D textures, no shadows

Return ONLY the raw master prompt text. No markdown backticks, no introduction, no labels.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType || "image/png",
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message || "Google AI Error" })
      };
    }

    const generatedPrompt = data.candidates[0].content.parts[0].text;

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