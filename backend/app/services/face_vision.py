import base64
import io
import json
import os
import re
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent.parent
load_dotenv(APP_DIR / ".env")
load_dotenv()

try:
    import httpx
except ImportError:
    httpx = None

try:
    from PIL import Image
except ImportError:
    Image = None

VALID_SKIN_TONES = {"fair", "light", "medium", "deep"}


def _heuristic_skin_tone_detection(image_bytes: bytes) -> dict:
    """
    Fallback Computer Vision analysis using Pillow colorimetry and skin-pixel segmentation.
    Checks if a human face / skin region is present, and classifies tone into fair, light, medium, or deep.
    """
    if Image is None:
        return {"has_face": False, "skin_tone": None, "confidence": 0.0, "reason": "Pillow not installed"}

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        # Resize for fast processing
        img.thumbnail((300, 300))
        width, height = img.size

        # Focus primarily on center & upper region where portrait faces appear
        crop_box = (int(width * 0.15), int(height * 0.1), int(width * 0.85), int(height * 0.8))
        portrait_region = img.crop(crop_box)
        pixels = list(portrait_region.getdata())
        total_pixels = len(pixels)

        if total_pixels == 0:
            return {"has_face": False, "skin_tone": None, "confidence": 0.0, "reason": "Empty image"}

        skin_luminances = []
        for r, g, b in pixels:
            # Human skin color boundaries in YCbCr space
            y = 0.299 * r + 0.587 * g + 0.114 * b
            cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
            cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b

            # R > G > B condition and standard skin bounding box in Cb-Cr
            if r > 60 and g > 40 and b > 20 and (max(r, g, b) - min(r, g, b) > 15):
                if abs(r - g) > 12 and r > g and r > b:
                    if 133 <= cr <= 173 and 77 <= cb <= 127:
                        skin_luminances.append(y)

        skin_count = len(skin_luminances)
        skin_ratio = skin_count / total_pixels

        # If less than 6% skin pixels found in portrait area, assume no face / non-human image
        if skin_ratio < 0.06 or skin_count < 100:
            return {
                "has_face": False,
                "skin_tone": None,
                "confidence": 0.3,
                "reason": "No human face or skin region detected in photo"
            }

        # Calculate average skin luminance
        avg_luminance = sum(skin_luminances) / skin_count

        if avg_luminance >= 180:
            tone = "fair"
        elif avg_luminance >= 148:
            tone = "light"
        elif avg_luminance >= 110:
            tone = "medium"
        else:
            tone = "deep"

        return {
            "has_face": True,
            "skin_tone": tone,
            "confidence": 0.85,
            "reason": f"Skin tone detected via colorimetry (avg luminance: {avg_luminance:.1f})"
        }
    except Exception as e:
        return {"has_face": False, "skin_tone": None, "confidence": 0.0, "reason": str(e)}


def _call_gemini_face_detection(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[dict]:
    """
    Calls Google Gemini Multimodal Vision to accurately detect human face and classify skin tone.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key or gemini_key.startswith("your_") or len(gemini_key) < 15 or not httpx:
        return None

    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "You are an expert biometric and aesthetic colorimetry AI for the WearWise styling system.\n"
        "Analyze the uploaded portrait image.\n\n"
        "TASK:\n"
        "1. Determine if a real human face or portrait is clearly visible in the photo.\n"
        "2. If the photo does NOT contain a human face (e.g. it is a car, landscape, animal, shoes, clothing item, food, cartoon, abstract wallpaper, or blurry object), output:\n"
        '   {"has_face": false, "skin_tone": null, "confidence": 0.95, "reason": "No human face detected"}\n'
        "3. If a human face IS visible, classify their facial complexion into EXACTLY one of these 4 categories:\n"
        "   - 'fair' (very light, porcelain, ivory, cool alabaster complexion)\n"
        "   - 'light' (light beige, warm ivory, peachy neutral complexion)\n"
        "   - 'medium' (warm olive, wheatish, golden tan, amber honey complexion)\n"
        "   - 'deep' (rich brown, dark bronze, espresso, deep ebony complexion)\n"
        '   Output JSON: {"has_face": true, "skin_tone": "fair"|"light"|"medium"|"deep", "confidence": float, "reason": "description"}\n\n'
        "OUTPUT FORMAT:\n"
        "Return ONLY pure JSON. Do not include markdown code blocks or backticks."
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
            "maxOutputTokens": 200
        }
    }

    models_to_try = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-lite-latest",
    ]

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        try:
            with httpx.Client(trust_env=False, timeout=25.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            raw = parts[0]["text"].strip()
                            clean = re.sub(r"^```(?:json)?\s*", "", raw)
                            clean = re.sub(r"\s*```$", "", clean).strip()
                            parsed = json.loads(clean)

                            has_face = bool(parsed.get("has_face"))
                            raw_tone = parsed.get("skin_tone")
                            skin_tone = str(raw_tone).lower().strip() if raw_tone else None

                            if not has_face or skin_tone not in VALID_SKIN_TONES:
                                return {
                                    "has_face": False,
                                    "skin_tone": None,
                                    "confidence": float(parsed.get("confidence", 0.9)),
                                    "reason": parsed.get("reason", "No human face detected")
                                }

                            return {
                                "has_face": True,
                                "skin_tone": skin_tone,
                                "confidence": float(parsed.get("confidence", 0.95)),
                                "reason": parsed.get("reason", f"Detected {skin_tone} tone")
                            }
        except Exception:
            continue

    return None


def detect_skin_tone_from_image(image_bytes: bytes, filename: str, mime_type: str = "image/jpeg") -> dict:
    """
    Main entry point to detect human skin tone from a user's uploaded portrait image.
    Uses Gemini Vision if available, falling back to Pillow spatial colorimetry.
    """
    # 1. Try Gemini Vision
    try:
        gemini_result = _call_gemini_face_detection(image_bytes, mime_type)
        if gemini_result is not None:
            return gemini_result
    except Exception as e:
        print(f"Gemini face detection exception: {e}")

    # 2. Fallback to Pillow Colorimetry
    return _heuristic_skin_tone_detection(image_bytes)
