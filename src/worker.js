/**
 * @author: kared
 * @create_date: 2025-05-10 21:15:59
 * @last_editors: kared
 * @last_edit_time: 2025-05-11 01:25:36
 * @description: This Cloudflare Worker script handles image generation.
 */

// import html template
import HTML from "./index.html";

// Available models list
const AVAILABLE_MODELS = [
  {
    id: "stable-diffusion-xl-base-1.0",
    name: "Stable Diffusion XL Base 1.0",
    description: "Stability AI SDXL 文生图模型",
    key: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    requiresImage: false,
  },
  {
    id: "flux-1-schnell",
    name: "FLUX.1 [schnell]",
    description: "精确细节表现的高性能文生图模型",
    key: "@cf/black-forest-labs/flux-1-schnell",
    requiresImage: false,
  },
  {
    id: "dreamshaper-8-lcm",
    name: "DreamShaper 8 LCM",
    description: "增强图像真实感的 SD 微调模型",
    key: "@cf/lykon/dreamshaper-8-lcm",
    requiresImage: false,
  },
  {
    id: "stable-diffusion-xl-lightning",
    name: "Stable Diffusion XL Lightning",
    description: "更加高效的文生图模型",
    key: "@cf/bytedance/stable-diffusion-xl-lightning",
    requiresImage: false,
  },
  {
    id: "stable-diffusion-v1-5-img2img",
    name: "Stable Diffusion v1.5 图生图",
    description: "将输入图像风格化或变换（需要提供图像URL）",
    key: "@cf/runwayml/stable-diffusion-v1-5-img2img",
    requiresImage: true,
  },
  {
    id: "stable-diffusion-v1-5-inpainting",
    name: "Stable Diffusion v1.5 局部重绘",
    description: "根据遮罩对局部区域进行重绘（需要图像URL，可选遮罩URL）",
    key: "@cf/runwayml/stable-diffusion-v1-5-inpainting",
    requiresImage: true,
    requiresMask: true,
  },
];

// Random prompts list (支持中英文混合)
const RANDOM_PROMPTS = [
  "cyberpunk cat samurai graphic art, blood splattered, beautiful colors",
  "一只可爱的猫咪，赛博朋克风格，霓虹灯光，未来城市背景",
  "1girl, solo, outdoors, camping, night, mountains, nature, stars, moon, tent, twin ponytails, green eyes, cheerful, happy, backpack, sleeping bag, camping stove, water bottle, mountain boots, gloves, sweater, hat, flashlight,forest, rocks, river, wood, smoke, shadows, contrast, clear sky, constellations, Milky Way",
  "古风美少女，长发飘飘，汉服，樱花树下，唯美意境，水墨画风格",
  "masterpiece, best quality, amazing quality, very aesthetic, high resolution, ultra-detailed, absurdres, newest, scenery, anime, anime coloring, (dappled sunlight:1.2), rim light, backlit, dramatic shadow, 1girl, long blonde hair, blue eyes, shiny eyes, parted lips, medium breasts, puffy sleeve white dress, forest, flowers, white butterfly, looking at viewer",
  "中国风景，山水画，云雾缭绕，高山流水，宁静祥和",
  "frost_glass, masterpiece, best quality, absurdres, cute girl wearing red Christmas dress, holding small reindeer, hug, braided ponytail, sidelocks, hairclip, hair ornaments, green eyes, (snowy forest, moonlight, Christmas trees), (sparkles, sparkling clothes), frosted, snow, aurora, moon, night, sharp focus, highly detailed, abstract, flowing",
  "机器人女孩，科幻风格，金属质感，蓝色发光眼睛，未来感",
  "1girl, hatsune miku, white pupils, power elements, microphone, vibrant blue color palette, abstract,abstract background, dreamlike atmosphere, delicate linework, wind-swept hair, energy, masterpiece, best quality, amazing quality",
  "夕阳西下，海边，浪漫氛围，温暖色调",
  "cyberpunk cat(neon lights:1.3) clutter,ultra detailed, ctrash, chaotic, low light, contrast, dark, rain ,at night ,cinematic , dystopic, broken ground, tunnels, skyscrapers",
  "梦幻森林，精灵，魔法光芒，神秘氛围",
  "Cyberpunk catgirl with purple hair, wearing leather and latex outfit with pink and purple cheetah print, holding a hand gun, black latex brassiere, glowing blue eyes with purple tech sunglasses, tail, large breasts, glowing techwear clothes, handguns, black leather jacket, tight shiny leather pants, cyberpunk alley background, Cyb3rWar3, Cyberware",
  "a wide aerial view of a floating elven city in the sky, with two elven figures walking side by side across a glowing skybridge, the bridge arching between tall crystal towers, surrounded by clouds and golden light, majestic and serene atmosphere, vivid style, magical fantasy architecture",
  "冬季雪景，小木屋，炊烟袅袅，温馨氛围",
  "masterpiece, newest, absurdres,incredibly absurdres, best quality, amazing quality, very aesthetic, 1girl, very long hair, blonde, multi-tied hair, center-flap bangs, sunset, cumulonimbus cloud, old tree,sitting in tree, dark blue track suit, adidas, simple bird",
  "龙，中国龙，祥云，金色鳞片，威严神圣",
  "beautiful girl, breasts, curvy, looking down scope, looking away from viewer, laying on the ground, laying ontop of jacket, aiming a sniper rifle, dark braided hair, backwards hat, armor, sleeveless, arm sleeve tattoos, muscle tone, dogtags, sweaty, foreshortening, depth of field, at night, night, alpine, lightly snowing, dusting of snow, Closeup, detailed face, freckles",
];

// Passwords for authentication
// Note: PASSWORDS should be configured via Cloudflare environment variables
// For backward compatibility, we keep a default fallback
const DEFAULT_PASSWORDS = ["admin123"];

/**
 * Get passwords from Cloudflare environment variables
 * Supports multiple formats:
 * 1. env.PASSWORD - single password as string
 * 2. env.PASSWORDS - comma-separated passwords as string
 * 3. env.PASSWORD_LIST - JSON array of passwords
 */
function getPasswords(env) {
  // Try to get from environment variables first
  if (env.PASSWORD) {
    return [env.PASSWORD];
  }

  if (env.PASSWORDS) {
    // Support comma-separated passwords
    return env.PASSWORDS.split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  if (env.PASSWORD_LIST) {
    try {
      const parsed = JSON.parse(env.PASSWORD_LIST);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse PASSWORD_LIST:", e);
    }
  }

  // Fallback to default passwords (for development/testing)
  console.warn(
    "⚠️ SECURITY WARNING: No password configured in environment variables! Using default password 'admin123'. Please configure PASSWORD in Cloudflare Dashboard: Settings → Variables and Secrets"
  );
  return DEFAULT_PASSWORDS;
}

/**
 * Translate using MyMemory Translation API (FREE, no API key required)
 * Limit: 5000 chars per request, 1000 requests per day per IP
 */
async function translateWithMyMemory(text) {
  try {
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=zh-CN|en`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.error("MyMemory Translation API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (
      data.responseStatus === 200 &&
      data.responseData &&
      data.responseData.translatedText
    ) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    console.error("MyMemory Translation failed:", e);
  }
  return null;
}

/**
 * Translate using LibreTranslate API (FREE, open source)
 * Can use public instance or self-hosted
 */
async function translateWithLibreTranslate(text, env) {
  try {
    // Use custom instance if configured, otherwise use public instance
    const apiUrl =
      env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate";
    const apiKey = env.LIBRETRANSLATE_API_KEY || null;

    const body = {
      q: text,
      source: "zh",
      target: "en",
      format: "text",
    };

    if (apiKey) {
      body.api_key = apiKey;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("LibreTranslate API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.translatedText) {
      return data.translatedText;
    }
  } catch (e) {
    console.error("LibreTranslate failed:", e);
  }
  return null;
}

/**
 * Translate using DeepL API (Requires API key, but has free tier)
 * Free tier: 500,000 characters/month
 */
async function translateWithDeepL(text, env) {
  if (!env.DEEPL_API_KEY) {
    return null;
  }

  try {
    // DeepL Free API endpoint (use api.deepl.com for Pro)
    const apiUrl =
      env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: "ZH",
        target_lang: "EN",
      }),
    });

    if (!response.ok) {
      console.error("DeepL API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.translations && data.translations[0]) {
      return data.translations[0].text;
    }
  } catch (e) {
    console.error("DeepL Translation failed:", e);
  }
  return null;
}

/**
 * Translate Chinese text to English using Google Translation API
 * Requires GOOGLE_TRANSLATE_API_KEY environment variable
 */
async function translateWithGoogle(text, env) {
  if (!env.GOOGLE_TRANSLATE_API_KEY) {
    return null;
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${env.GOOGLE_TRANSLATE_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "zh-CN",
        target: "en",
        format: "text",
      }),
    });

    if (!response.ok) {
      console.error("Google Translation API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.translations && data.data.translations[0]) {
      return data.data.translations[0].translatedText;
    }
  } catch (e) {
    console.error("Google Translation failed:", e);
  }
  return null;
}

/**
 * Translate Chinese text to English using Cloudflare AI
 */
async function translateWithCloudflareAI(text, env) {
  try {
    const translation_inputs = {
      text: text,
      source_lang: "zh",
      target_lang: "en",
    };
    const translation_response = await env.AI.run(
      "@cf/meta/m2m100-1.2b",
      translation_inputs
    );
    if (translation_response && translation_response.translated_text) {
      return translation_response.translated_text;
    }
  } catch (e) {
    console.error("Cloudflare AI translation failed:", e);
  }
  return null;
}

/**
 * Clean up translated text:
 * - Remove leading and trailing punctuation (period, colon, comma, etc.)
 * - Remove unnecessary plural 's' from common single nouns (school->school, hospital->hospital)
 * - Remove redundant articles (a, an, the)
 * - Normalize whitespace
 */
function cleanTranslatedText(text) {
  if (!text) return text;

  // Remove leading/trailing whitespace first
  text = text.trim();

  // *** CRITICAL: Remove ALL HTML tags (MyMemory sometimes returns HTML markup like <g id="bold">) ***
  text = text.replace(/<[^>]*>/g, "");
  text = text.trim();

  // Remove all trailing punctuation (period, colon, comma, semicolon, exclamation, question mark, quotes)
  // Using a more aggressive pattern to catch all cases
  text = text.replace(/[\s.:,;!?"']+$/g, "").trim();

  // Remove all leading punctuation
  text = text.replace(/^[\s.:,;!?"']+/g, "").trim();

  // Remove any standalone colons or punctuation marks within the text
  // (but preserve them if they're part of a legitimate phrase)
  text = text.replace(/\s*:\s*$/g, ""); // specifically remove trailing colon with spaces
  text = text.replace(/^\s*:\s*/g, ""); // specifically remove leading colon with spaces

  // Remove unnecessary plural 's' from common single nouns
  const singularPatterns = [
    /\b(school|hospital|cat|dog|girl|boy|man|woman|person|house|city|car|tree|flower|mountain|river|sky|sun|moon|star|cloud|building|street|park|garden|beach|forest|lake|ocean|island|village|town)s\b/gi,
  ];

  singularPatterns.forEach((pattern) => {
    text = text.replace(pattern, (match, word) => word);
  });

  // Normalize multiple spaces to single space
  text = text.replace(/\s+/g, " ");

  // Remove redundant articles (a/an/the)
  text = text
    .replace(/\b(a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Final pass: remove any remaining trailing punctuation
  text = text.replace(/[\s.:,;!?"']+$/g, "").trim();

  return text;
}

export default {
  async fetch(request, env) {
    const originalHost = request.headers.get("host");

    // Get passwords from environment
    const PASSWORDS = getPasswords(env);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // process api requests
      if (path === "/api/models") {
        // get available models list
        return new Response(JSON.stringify(AVAILABLE_MODELS), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } else if (path === "/api/prompts") {
        // get random prompts list
        return new Response(JSON.stringify(RANDOM_PROMPTS), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } else if (path === "/api/config") {
        // Check if user is already authenticated via Cookie
        const cookieHeader = request.headers.get("cookie") || "";
        const isAuthenticated = cookieHeader.includes("auth=1");

        // Only require password if passwords are set AND user is not authenticated
        const requirePassword = PASSWORDS.length > 0 && !isAuthenticated;

        return new Response(
          JSON.stringify({ require_password: requirePassword }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else if (path === "/api/auth" && request.method === "POST") {
        // perform password authentication and set cookie
        const data = await request.json().catch(() => ({}));
        const ok =
          PASSWORDS.length === 0
            ? true
            : data &&
              typeof data.password === "string" &&
              PASSWORDS.includes(data.password);
        if (!ok) {
          return new Response(JSON.stringify({ error: "密码错误" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Set cookie without Secure flag for local development (Cloudflare will add it in production)
        const cookie = `auth=1; Path=/; Max-Age=${
          7 * 24 * 3600
        }; HttpOnly; SameSite=Lax`;
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Set-Cookie": cookie,
          },
        });
      } else if (request.method === "POST") {
        // process POST request for image generation
        const data = await request.json();

        // Check if password is required and valid (Cookie or request body)
        const cookieHeader = request.headers.get("cookie") || "";
        const authedByCookie = /(?:^|;\s*)auth=1(?:;|$)/.test(cookieHeader);
        const authedByBody =
          data &&
          typeof data.password === "string" &&
          PASSWORDS.includes(data.password);
        if (PASSWORDS.length > 0 && !(authedByCookie || authedByBody)) {
          return new Response(JSON.stringify({ error: "需要正确的访问密码" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if ("prompt" in data && "model" in data) {
          // --- Start of translation logic ---
          // Helper function to detect Chinese characters (including punctuation)
          const hasChinese = (text) =>
            /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(text);

          // Helper function to translate Chinese to English
          // Translation priority (from best to fallback):
          // 1. DeepL (if API key configured) - Best quality
          // 2. Google Translation (if API key configured) - Great quality
          // 3. MyMemory (free, no API key) - Good quality
          // 4. LibreTranslate (free, no API key) - Fair quality
          // 5. Cloudflare AI (free, default) - Good quality
          const translateToEnglish = async (text, label = "prompt") => {
            let raw_translation = null;
            let translation_source = null;

            // Try DeepL first if API key is configured
            if (!raw_translation && env.DEEPL_API_KEY) {
              raw_translation = await translateWithDeepL(text, env);
              if (raw_translation) {
                translation_source = "DeepL";
              }
            }

            // Try Google Translation if API key is configured
            if (!raw_translation && env.GOOGLE_TRANSLATE_API_KEY) {
              raw_translation = await translateWithGoogle(text, env);
              if (raw_translation) {
                translation_source = "Google";
              }
            }

            // Try MyMemory (free, no API key required)
            if (!raw_translation) {
              raw_translation = await translateWithMyMemory(text);
              if (raw_translation) {
                translation_source = "MyMemory";
              }
            }

            // Try LibreTranslate (free, open source)
            if (!raw_translation) {
              raw_translation = await translateWithLibreTranslate(text, env);
              if (raw_translation) {
                translation_source = "LibreTranslate";
              }
            }

            // Fallback to Cloudflare AI
            if (!raw_translation) {
              raw_translation = await translateWithCloudflareAI(text, env);
              if (raw_translation) {
                translation_source = "Cloudflare AI";
              }
            }

            // Clean up the translation
            if (raw_translation) {
              // First clean, then lowercase, then clean again for better results
              let cleaned = cleanTranslatedText(raw_translation);
              let refined_translation = cleanTranslatedText(
                cleaned.toLowerCase()
              );
              console.log(
                `[${translation_source}] Translation for ${label}: "${text}" -> RAW: "${raw_translation}" -> CLEANED: "${refined_translation}"`
              );
              return refined_translation;
            }

            console.error(`All translation services failed for ${label}`);
            return null;
          };

          // Translate positive prompt if contains Chinese
          let prompt = data.prompt || "";
          let translated_prompt = null;
          if (hasChinese(prompt)) {
            translated_prompt = await translateToEnglish(
              prompt,
              "positive prompt"
            );
          }
          const final_prompt = translated_prompt || prompt;

          // Translate negative prompt if contains Chinese
          let negative_prompt = data.negative_prompt || "";
          let translated_negative_prompt = null;
          if (hasChinese(negative_prompt)) {
            translated_negative_prompt = await translateToEnglish(
              negative_prompt,
              "negative prompt"
            );
          }
          const final_negative_prompt =
            translated_negative_prompt || negative_prompt;
          // --- End of translation logic ---

          const response_headers = {};
          if (translated_prompt) {
            response_headers["X-Translated-Prompt"] =
              encodeURIComponent(translated_prompt);
          }
          if (translated_negative_prompt) {
            response_headers["X-Translated-Negative-Prompt"] =
              encodeURIComponent(translated_negative_prompt);
          }

          const selectedModel = AVAILABLE_MODELS.find(
            (m) => m.id === data.model
          );
          if (!selectedModel) {
            return new Response(JSON.stringify({ error: "Model is invalid" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const model = selectedModel.key;
          let inputs = {};
          const fetchImageToBytes = async (url, label) => {
            const resp = await fetch(url);
            if (!resp.ok) {
              return { error: `${label}获取失败，HTTP ${resp.status}` };
            }
            const ct = resp.headers.get("content-type") || "";
            if (!ct.startsWith("image/")) {
              return { error: `${label}不是图片资源，content-type=${ct}` };
            }
            const cl = parseInt(resp.headers.get("content-length") || "0", 10);
            // 设定 10MB 上限，避免大文件触发内部错误
            if (cl && cl > 10 * 1024 * 1024) {
              return {
                error: `${label}体积过大(${(cl / 1024 / 1024).toFixed(
                  2
                )}MB)，请不超过10MB`,
              };
            }
            const bytes = new Uint8Array(await resp.arrayBuffer());
            return { bytes, contentType: ct, size: bytes.length };
          };
          const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
          const sanitizeDimension = (val, def = 512) => {
            let v = typeof val === "number" ? val : def;
            v = clamp(v, 256, 2048);
            // 四舍五入到最近的64倍数
            v = Math.round(v / 64) * 64;
            return v;
          };

          // Input parameter processing
          if (data.model === "flux-1-schnell") {
            let steps = data.num_steps || 6;
            if (steps >= 8) steps = 8;
            else if (steps <= 4) steps = 4;

            // Only prompt and steps
            inputs = {
              prompt: final_prompt || "cyberpunk cat",
              steps: steps,
            };
          } else if (
            data.model === "stable-diffusion-v1-5-img2img" ||
            data.model === "stable-diffusion-v1-5-inpainting"
          ) {
            // 图生图 / 局部重绘需要图像URL
            if (!data.image_url) {
              return new Response(
                JSON.stringify({
                  error: "该模型需要提供 image_url 参数（输入图像 URL）",
                }),
                {
                  status: 400,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                }
              );
            }

            // 拉取输入图像/遮罩为二进制并校验
            const imageResult = await fetchImageToBytes(
              data.image_url,
              "输入图像"
            );
            if (imageResult.error) {
              return new Response(
                JSON.stringify({ error: imageResult.error }),
                {
                  status: 400,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                }
              );
            }

            let maskBytes = undefined;
            if (data.model === "stable-diffusion-v1-5-inpainting") {
              if (!data.mask_url) {
                return new Response(
                  JSON.stringify({
                    error: "该模型需要提供 mask_url 参数（遮罩图像 URL）",
                  }),
                  {
                    status: 400,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
              const maskResult = await fetchImageToBytes(
                data.mask_url,
                "遮罩图像"
              );
              if (maskResult.error) {
                return new Response(
                  JSON.stringify({ error: maskResult.error }),
                  {
                    status: 400,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
              maskBytes = maskResult.bytes;
            }

            // 兼容一些模型对字段命名的要求：有的需要 mask_image
            inputs = {
              prompt: final_prompt || "cyberpunk cat",
              negative_prompt: final_negative_prompt || "",
              // 建议使用更小的分辨率，避免 3001 内部错误
              height: sanitizeDimension(parseInt(data.height, 10) || 512, 512),
              width: sanitizeDimension(parseInt(data.width, 10) || 512, 512),
              num_steps: clamp(parseInt(data.num_steps, 10) || 20, 1, 50),
              strength: clamp(parseFloat(data.strength ?? 0.8), 0.0, 1.0),
              guidance: clamp(parseFloat(data.guidance ?? 7.5), 0.0, 30.0),
              seed:
                data.seed ||
                parseInt((Math.random() * 1024 * 1024).toString(), 10),
              image: [...imageResult.bytes],
              ...(maskBytes
                ? { mask: [...maskBytes], mask_image: [...maskBytes] }
                : {}),
            };
          } else {
            // Default input parameters
            inputs = {
              prompt: final_prompt || "cyberpunk cat",
              negative_prompt: final_negative_prompt || "",
              height: data.height || 1024,
              width: data.width || 1024,
              num_steps: data.num_steps || 20,
              strength: data.strength || 0.1,
              guidance: data.guidance || 7.5,
              seed:
                data.seed ||
                parseInt((Math.random() * 1024 * 1024).toString(), 10),
            };
          }

          console.log(
            `Generating image with ${model} and prompt: ${inputs.prompt.substring(
              0,
              50
            )}...`
          );

          try {
            const numOutputs = clamp(parseInt(data.num_outputs, 10) || 1, 1, 8);
            const generateOnce = async (seedOffset = 0) => {
              const localInputs = { ...inputs };

              // Be more defensive about the seed
              let seed = Number(localInputs.seed);
              if (isNaN(seed)) {
                seed = Math.floor(Math.random() * 4294967295);
              }
              localInputs.seed = seed + seedOffset;

              const t0 = Date.now();
              const res = await env.AI.run(model, localInputs);
              const t1 = Date.now();
              return { res, seconds: (t1 - t0) / 1000 };
            };

            // helper: convert bytes to base64
            const bytesToBase64 = (bytes) => {
              let binary = "";
              const chunk = 0x8000;
              for (let i = 0; i < bytes.length; i += chunk) {
                const sub = bytes.subarray(i, i + chunk);
                binary += String.fromCharCode.apply(null, sub);
              }
              return btoa(binary);
            };

            if (numOutputs > 1) {
              const tasks = Array.from({ length: numOutputs }, (_, i) =>
                generateOnce(i)
              );
              const results = await Promise.all(tasks);
              const secondsAvg =
                results.reduce((s, r) => s + r.seconds, 0) / results.length;

              const images = [];
              for (const { res } of results) {
                if (data.model === "flux-1-schnell") {
                  const json = typeof res === "object" ? res : JSON.parse(res);
                  if (!json.image)
                    throw new Error(
                      "Invalid response from FLUX: missing image"
                    );
                  images.push(`data:image/png;base64,${json.image}`);
                } else {
                  // binary bytes -> base64
                  let bytes;
                  if (res instanceof Uint8Array) bytes = res;
                  else if (
                    res &&
                    typeof res === "object" &&
                    typeof res.byteLength === "number"
                  )
                    bytes = new Uint8Array(res);
                  else
                    bytes = new Uint8Array(
                      await new Response(res).arrayBuffer()
                    );
                  images.push(`data:image/png;base64,${bytesToBase64(bytes)}`);
                }
              }

              return new Response(JSON.stringify({ images }), {
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                  "X-Used-Model": selectedModel.id,
                  "X-Server-Seconds": secondsAvg.toFixed(3),
                  ...response_headers,
                },
              });
            }

            const { res: response, seconds: serverSeconds } =
              await generateOnce(0);

            // Processing the response of the flux-1-schnell model
            if (data.model === "flux-1-schnell") {
              let jsonResponse;

              if (typeof response === "object") {
                jsonResponse = response;
              } else {
                try {
                  jsonResponse = JSON.parse(response);
                } catch (e) {
                  console.error("Failed to parse JSON response:", e);
                  return new Response(
                    JSON.stringify({
                      error: "Failed to parse response",
                      details: e.message,
                    }),
                    {
                      status: 500,
                      headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                }
              }

              if (!jsonResponse.image) {
                return new Response(
                  JSON.stringify({
                    error: "Invalid response format",
                    details: "Image data not found in response",
                  }),
                  {
                    status: 500,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }

              try {
                // Convert from base64 to binary data
                const binaryString = atob(jsonResponse.image);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                // Returns binary data in PNG format
                return new Response(bytes, {
                  headers: {
                    ...corsHeaders,
                    "content-type": "image/png",
                    "X-Used-Model": selectedModel.id,
                    ...(inputs.seed ? { "X-Seed": String(inputs.seed) } : {}),
                    "X-Image-Bytes": String(bytes.length),
                    "X-Server-Seconds": serverSeconds.toFixed(3),
                    ...response_headers,
                  },
                });
              } catch (e) {
                console.error("Failed to convert base64 to binary:", e);
                return new Response(
                  JSON.stringify({
                    error: "Failed to process image data",
                    details: e.message,
                  }),
                  {
                    status: 500,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
            } else {
              // Return the response directly (binary)
              let imageByteSize = undefined;
              try {
                if (response && typeof response === "object") {
                  if (response instanceof Uint8Array)
                    imageByteSize = response.length;
                  // ArrayBuffer has byteLength
                  if (typeof response.byteLength === "number")
                    imageByteSize = response.byteLength;
                }
              } catch (_) {}

              return new Response(response, {
                headers: {
                  ...corsHeaders,
                  "content-type": "image/png",
                  "X-Used-Model": selectedModel.id,
                  ...(inputs.seed ? { "X-Seed": String(inputs.seed) } : {}),
                  ...(imageByteSize
                    ? { "X-Image-Bytes": String(imageByteSize) }
                    : {}),
                  "X-Server-Seconds": serverSeconds.toFixed(3),
                  ...response_headers,
                },
              });
            }
          } catch (aiError) {
            console.error("AI generation error:", aiError);
            return new Response(
              JSON.stringify({
                error: "Image generation failed",
                details: aiError && (aiError.message || aiError.toString()),
                model: selectedModel.id,
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              error: "Missing required parameter: prompt or model",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else if (path.endsWith(".html") || path === "/") {
        // redirect to index.html for HTML requests
        return new Response(HTML.replace(/{{host}}/g, originalHost), {
          status: 200,
          headers: {
            ...corsHeaders,
            "content-type": "text/html",
          },
        });
      } else {
        return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
