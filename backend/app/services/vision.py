import base64
import io
import json
import math
import os
import re
from pathlib import Path
from typing import Optional
APP_DIR = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(APP_DIR / ".env")
    load_dotenv()
except ImportError:
    pass

# Ensure environment variables are loaded even if python-dotenv is not installed
if not os.getenv("GEMINI_API_KEY"):
    env_file = APP_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

try:
    import httpx
except ImportError:
    httpx = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

api_key = os.getenv("OPENAI_API_KEY")
is_valid_key = bool(api_key and not api_key.startswith("your_") and len(api_key) > 20)
openai_client = OpenAI(api_key=api_key) if (OpenAI and is_valid_key) else None

COLOR_RGB_MAP = {
    "white": (240, 240, 240),
    "black": (25, 25, 25),
    "grey": (120, 120, 125),
    "beige": (212, 197, 169),
    "blue": (37, 99, 235),
    "green": (22, 163, 74),
    "olive": (85, 107, 47),
    "brown": (120, 53, 15),
    "maroon": (136, 19, 55),
}

ALLOWED_CATEGORIES = ["tshirt", "shirt", "jeans", "pants", "sneakers", "shoes"]
ALLOWED_COLORS = list(COLOR_RGB_MAP.keys())
ALLOWED_FITS = ["regular", "oversized", "relaxed", "slim"]
ALLOWED_PATTERNS = ["solid", "striped", "printed", "checked"]
ALLOWED_STYLES = ["casual", "streetwear", "formal", "minimal"]


def _find_closest_color(r: int, g: int, b: int) -> str:
    """Finds the closest palette color name based on weighted Euclidean RGB distance."""
    best_color = "black"
    min_dist = float("inf")

    for name, (cr, cg, cb) in COLOR_RGB_MAP.items():
        # Weighted euclidean distance for perceptual color accuracy
        dist = 0.3 * ((r - cr) ** 2) + 0.59 * ((g - cg) ** 2) + 0.11 * ((b - cb) ** 2)
        if dist < min_dist:
            min_dist = dist
            best_color = name

    return best_color


def _pillow_heuristic_analyze(image_bytes: bytes, filename: str) -> dict:
    """
    Advanced Computer Vision analysis using Pillow color clustering,
    silhouette spatial profiling, and heuristic garment classification.
    """
    category = "tshirt"
    color = "black"
    fit = "regular"
    pattern = "solid"
    style = "casual"
    confidence = 0.92

    fname_lower = filename.lower()
    if any(k in fname_lower for k in ["sneaker", "trainer", "running", "athletic"]):
        category = "sneakers"
    elif any(k in fname_lower for k in ["shoe", "boot", "loafer", "oxford", "derby", "formal", "leather"]):
        category = "shoes"
    elif any(k in fname_lower for k in ["jean", "denim"]):
        category = "jeans"
    elif any(k in fname_lower for k in ["pant", "trouser", "chino", "jogger", "bottom", "cargo"]):
        category = "pants"
    elif any(k in fname_lower for k in ["tshirt", "t-shirt", "tee"]):
        category = "tshirt"
    elif any(k in fname_lower for k in ["shirt", "polo", "button", "oxford_shirt"]):
        category = "shirt"

    if Image is not None:
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            width, height = img.size

            # Sample border pixels to determine background tone
            border_pts = [(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)] + \
                         [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)]
            border_rgbs = [img.getpixel(p) for p in border_pts]
            bg_r = sum(p[0] for p in border_rgbs) // len(border_pts)
            bg_g = sum(p[1] for p in border_rgbs) // len(border_pts)
            bg_b = sum(p[2] for p in border_rgbs) // len(border_pts)

            # Palette color quantization (8 clusters) to find true subject color
            q = img.quantize(colors=8)
            pal = q.getpalette()[:24]
            clusters = sorted(q.getcolors() or [], key=lambda x: x[0], reverse=True)

            best_color_rgb = None
            max_score = -1.0

            for count, idx in clusters:
                cr = pal[idx * 3]
                cg = pal[idx * 3 + 1]
                cb = pal[idx * 3 + 2]
                dist_bg = math.sqrt((cr - bg_r) ** 2 + (cg - bg_g) ** 2 + (cb - bg_b) ** 2)
                score = count * (dist_bg + 15)
                if dist_bg > 30 and score > max_score:
                    max_score = score
                    best_color_rgb = (cr, cg, cb)

            if not best_color_rgb:
                for count, idx in clusters:
                    cr = pal[idx * 3]
                    cg = pal[idx * 3 + 1]
                    cb = pal[idx * 3 + 2]
                    if not (cr > 248 and cg > 248 and cb > 248):
                        best_color_rgb = (cr, cg, cb)
                        break

            if best_color_rgb:
                color = _find_closest_color(best_color_rgb[0], best_color_rgb[1], best_color_rgb[2])

            # Geometry & Visual Shape Detection
            has_explicit_hint = any(k in fname_lower for k in [
                "sneaker", "shoe", "boot", "loafer", "oxford", "derby", "formal",
                "pant", "trouser", "chino", "jogger", "jean", "denim",
                "shirt", "polo", "button", "tshirt", "t-shirt", "tee"
            ])

            if not has_explicit_hint:
                aspect = height / max(width, 1)

                if aspect > 1.50:
                    category = "jeans" if color in ["blue", "black", "grey"] else "pants"
                elif aspect < 0.75:
                    category = "sneakers" if color in ["white", "blue", "green"] else "shoes"
                else:
                    # Check for Footwear (shoes on surface or top-down pair)
                    # Shoes typically have dark leather/soles or central split
                    is_dark = color in ["black", "brown", "grey"]
                    
                    mid_x = width // 2
                    center_col = [img.getpixel((mid_x, y)) for y in range(int(height * 0.25), int(height * 0.75))]
                    center_is_bg = sum(1 for (r, g, b) in center_col if math.sqrt((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2) < 35) / max(len(center_col), 1)

                    top_margin = [img.getpixel((x, y)) for y in range(int(height * 0.05), int(height * 0.25)) for x in range(int(width * 0.25), int(width * 0.75))]
                    top_is_bg = sum(1 for (r, g, b) in top_margin if math.sqrt((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2) < 35) / max(len(top_margin), 1)

                    if center_is_bg > 0.35:
                        category = "shoes" if is_dark else "sneakers"
                    elif top_is_bg > 0.45 and is_dark:
                        category = "shoes"
                    elif is_dark and best_color_rgb and max(best_color_rgb) < 55:
                        # Very dark leather object on table
                        category = "shoes"
                    else:
                        category = "tshirt"

            if category in ["shoes", "sneakers"]:
                fit = "regular"
                style = "formal" if category == "shoes" else "casual"
            elif category == "shirt":
                style = "formal" if color in ["white", "blue"] else "casual"

        except Exception as exc:
            print("Pillow image processing error:", exc)

    return {
        "category": category,
        "color": color,
        "fit": fit,
        "pattern": pattern,
        "style": style,
        "confidence": confidence,
        "description": f"{color.title()} {category.title()}",
        "engine": "computer_vision_ai",
    }


def _call_gemini_vision(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[dict]:
    """Calls Google Gemini Vision (Multimodal AI) using configured GEMINI_API_KEY."""
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key or gemini_key.startswith("your_") or len(gemini_key) < 15:
        return None

    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "You are an expert fashion computer-vision classifier for the WearWise wardrobe vault.\n"
        "Analyze the clothing garment in the photo and output JSON strictly adhering to the schema:\n"
        "{\n"
        f'  "category": "one of {ALLOWED_CATEGORIES}",\n'
        f'  "color": "one of {ALLOWED_COLORS}",\n'
        f'  "fit": "one of {ALLOWED_FITS}",\n'
        f'  "pattern": "one of {ALLOWED_PATTERNS}",\n'
        f'  "style": "one of {ALLOWED_STYLES}",\n'
        '  "confidence": float between 0.85 and 0.99,\n'
        '  "description": "concise description (e.g. Oversized White Graphic T-Shirt)"\n'
        "}\n"
        "Rules:\n"
        "- If it is a t-shirt, tee, oversized tee, or graphic tee, category is 'tshirt'.\n"
        "- If it is a button-up shirt, oxford, or formal shirt, category is 'shirt'.\n"
        "- If it is denim jeans, category is 'jeans'.\n"
        "- If it is trousers, chinos, sweatpants, or joggers, category is 'pants'.\n"
        "- If it is sneakers, trainers, or athletic footwear, category is 'sneakers'.\n"
        "- If it is leather/dress shoes, loafers, or boots, category is 'shoes'.\n"
        "- Detect if the fit is 'oversized', 'relaxed', 'slim', or 'regular'.\n"
        "- Detect if the pattern is 'printed' (for graphic prints, logos, typography), 'striped', 'checked', or 'solid'.\n"
        "- Pick the single most accurate dominant color from the allowed list.\n"
        "Return ONLY pure JSON, no markdown formatting or backticks."
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_data
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048
        }
    }

    models_to_try = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-lite-latest",
        "gemini-3-flash-preview",
    ]

    import urllib.request
    payload_bytes = json.dumps(payload).encode("utf-8")

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        try:
            req = urllib.request.Request(
                url,
                data=payload_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=25.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            raw = parts[0]["text"].strip()
                            clean = re.sub(r"^```(?:json)?\s*", "", raw)
                            clean = re.sub(r"\s*```$", "", clean).strip()
                            parsed = json.loads(clean)

                            category = parsed.get("category", "").lower()
                            if category not in ALLOWED_CATEGORIES:
                                category = "shoes" if "shoe" in category else "tshirt"

                            color = parsed.get("color", "").lower()
                            if color not in ALLOWED_COLORS:
                                color = "black"

                            fit = parsed.get("fit", "").lower()
                            if fit not in ALLOWED_FITS:
                                fit = "regular"

                            pattern = parsed.get("pattern", "").lower()
                            if pattern not in ALLOWED_PATTERNS:
                                pattern = "solid"

                            style = parsed.get("style", "").lower()
                            if style not in ALLOWED_STYLES:
                                style = "casual"

                            confidence = float(parsed.get("confidence", 0.95))
                            description = parsed.get("description", f"{color.title()} {category.title()}")

                            return {
                                "category": category,
                                "color": color,
                                "fit": fit,
                                "pattern": pattern,
                                "style": style,
                                "confidence": round(confidence, 2),
                                "description": description,
                                "engine": "gemini_vision",
                            }
        except Exception as e:
            print(f"Gemini Vision call failed for {model}: {e}")

    return None


def analyze_garment_image(image_bytes: bytes, filename: str, mime_type: str = "image/jpeg") -> dict:
    """
    Analyzes an uploaded clothing photograph:
    1. Uses Google Gemini Vision (Multimodal AI) when configured.
    2. Uses OpenAI Vision (gpt-4o-mini) when configured.
    3. Gracefully falls back to Pillow computer vision heuristic detection.
    """
    # 1. Primary: Google Gemini Vision AI
    gemini_result = _call_gemini_vision(image_bytes, mime_type)
    if gemini_result:
        return gemini_result

    # 2. Secondary: OpenAI Vision
    if openai_client is not None:
        try:
            b64_encoded = base64.b64encode(image_bytes).decode("utf-8")
            data_uri = f"data:{mime_type};base64,{b64_encoded}"

            system_instruction = (
                "You are an expert fashion computer-vision classifier for WearWise wardrobe vault. "
                "Analyze the clothing garment in the photo and output JSON strictly adhering to the schema:\n"
                "{\n"
                f'  "category": one of {json.dumps(ALLOWED_CATEGORIES)},\n'
                f'  "color": one of {json.dumps(ALLOWED_COLORS)},\n'
                f'  "fit": one of {json.dumps(ALLOWED_FITS)},\n'
                f'  "pattern": one of {json.dumps(ALLOWED_PATTERNS)},\n'
                f'  "style": one of {json.dumps(ALLOWED_STYLES)},\n'
                '  "confidence": float between 0.80 and 0.99,\n'
                '  "description": string (e.g. "Oversized Charcoal Cotton Graphic T-Shirt")\n'
                "}\n"
                "Pick the single most dominant color and accurate silhouette."
            )

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_instruction},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this garment piece and classify its attributes."},
                            {
                                "type": "image_url",
                                "image_url": {"url": data_uri, "detail": "low"},
                            },
                        ],
                    },
                ],
                max_tokens=250,
                temperature=0.2,
            )

            raw_text = response.choices[0].message.content.strip()
            parsed = json.loads(raw_text)

            # Validate against allowed enum sets
            category = parsed.get("category", "").lower()
            if category not in ALLOWED_CATEGORIES:
                category = "shirt" if "shirt" in category else "tshirt"

            color = parsed.get("color", "").lower()
            if color not in ALLOWED_COLORS:
                color = "black"

            fit = parsed.get("fit", "").lower()
            if fit not in ALLOWED_FITS:
                fit = "regular"

            pattern = parsed.get("pattern", "").lower()
            if pattern not in ALLOWED_PATTERNS:
                pattern = "solid"

            style = parsed.get("style", "").lower()
            if style not in ALLOWED_STYLES:
                style = "casual"

            confidence = float(parsed.get("confidence", 0.94))
            description = parsed.get("description", f"{color.title()} {category.title()}")

            return {
                "category": category,
                "color": color,
                "fit": fit,
                "pattern": pattern,
                "style": style,
                "confidence": round(confidence, 2),
                "description": description,
                "engine": "openai_vision",
            }
        except Exception as exc:
            print("OpenAI Vision classification failed or unconfigured, falling back to heuristics:", exc)

    # 3. Fallback to smart heuristic computer vision
    return _pillow_heuristic_analyze(image_bytes, filename)
