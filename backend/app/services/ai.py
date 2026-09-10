import os
from pathlib import Path
from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent.parent
load_dotenv(APP_DIR / ".env")
load_dotenv()

try:
    from openai import OpenAI
except ModuleNotFoundError:  # pragma: no cover
    OpenAI = None

api_key = os.getenv("OPENAI_API_KEY")
is_valid_key = bool(api_key and not api_key.startswith("your_") and len(api_key) > 20)
client = OpenAI(api_key=api_key) if (OpenAI is not None and is_valid_key) else None


def _heuristic_explanation(top, bottom, shoes, profile, occasion: str, weather: str | None = None) -> str:
    pref_style = getattr(profile, "style_preference", "casual") or "casual"
    pref_fit = getattr(profile, "fit_preference", "regular") or "regular"

    weather_notes = {
        "warm": "The breathable top keeps you cool and comfortable in warmer temperatures.",
        "cold": "The structured pieces provide warmth and a grounded silhouette suited for cold weather.",
        "cool": "The layered versatility adapts effortlessly to cool, brisk conditions.",
    }
    weather_note = weather_notes.get((weather or "").lower(), "")

    return (
        f"This look pairs your {top.color.title()} {top.category.title()} with {bottom.color.title()} {bottom.category.title()} and {shoes.color.title()} {shoes.category.title()}. "
        f"The combination harmonizes your {pref_style} style with a {pref_fit} fit tailored for a {occasion} setting. "
        f"{weather_note}"
    ).strip()


def explain_outfit(
    top,
    bottom,
    shoes,
    profile,
    occasion: str,
    weather: str | None = None
) -> str:
    prompt = f"""You are a personal fashion stylist for WearWise.

Explain why this outfit combination looks great together.

Context:
- User complexion / skin tone: {getattr(profile, 'skin_tone', 'neutral')}
- Occasion: {occasion}
{weather_desc}

Garments:
- Top: {top.color} {top.fit or ''} {top.category}
- Bottom: {bottom.color} {bottom.fit or ''} {bottom.category}
- Shoes: {shoes.color} {shoes.category}

RULES:
- Maximum 2 to 3 short sentences ONLY.
- Write in simple, natural, conversational English that anyone can easily understand.
- Do NOT use complex words, bullet points, markdown quotes, or lists.
- Directly explain why these colors and fits look sharp together for this {occasion}."""

    # 1. Primary: Google Gemini AI
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key and not gemini_key.startswith("your_") and len(gemini_key) > 15:
        try:
            from app.services.stylist import call_gemini_api
            explanation = call_gemini_api(
                api_key=gemini_key,
                system_prompt="You are a friendly personal fashion stylist for WearWise. Write strictly 2 to 3 short, easy-to-read sentences in simple English explaining why an outfit works.",
                message=prompt,
                history=[]
            )
            if explanation:
                clean_exp = explanation.strip().strip('"\'')
                return clean_exp
        except Exception as e:
            print("Gemini outfit explanation failed, trying fallbacks:", e)

    # 2. Secondary: OpenAI
    if client is not None:
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a concise, perceptive personal fashion stylist assistant. Write strictly 2 to 3 short sentences in simple English."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            return response.choices[0].message.content.strip().strip('"\'')
        except Exception as exc:
            print("OpenAI outfit explanation failed, falling back to heuristics:", exc)

    # 3. Fallback: Smart heuristic explanation
    return _heuristic_explanation(top, bottom, shoes, profile, occasion, weather)


def get_harmonic_breakdown(top, bottom, shoes, profile=None, occasion: str = "casual", weather: str | None = None) -> dict:
    """Calculates dynamic, AI-grade harmonic breakdown metrics for an outfit."""
    top_col = (getattr(top, "color", "") or "").lower()
    bot_col = (getattr(bottom, "color", "") or "").lower()
    top_fit = (getattr(top, "fit", "") or "regular").lower()
    bot_fit = (getattr(bottom, "fit", "") or "regular").lower()

    # 1. Color Contrast & Tonal Harmony
    if top_col == bot_col and top_col in ["black", "grey", "blue", "beige"]:
        color_contrast = "Monochromatic Elegance"
    elif {top_col, bot_col} == {"white", "black"}:
        color_contrast = "High-Contrast Classic"
    elif top_col in ["white", "black", "grey"] and bot_col in ["blue", "navy"]:
        color_contrast = "Timeless Indigo Anchor"
    elif top_col in ["beige", "brown", "olive"] or bot_col in ["beige", "brown", "olive"]:
        color_contrast = "Warm Earthy Harmony"
    elif top_col in ["white", "black", "beige", "grey"] and bot_col in ["white", "black", "beige", "grey"]:
        color_contrast = "Clean Neutral Balance"
    elif "maroon" in (top_col, bot_col):
        color_contrast = "Rich Tonal Statement"
    elif "green" in (top_col, bot_col) or "olive" in (top_col, bot_col):
        color_contrast = "Nature-Inspired Palette"
    else:
        color_contrast = "Complementary Dual-Tone"

    # 2. Silhouette Balance
    if "oversized" in top_fit or "relaxed" in top_fit:
        if "slim" in bot_fit or "regular" in bot_fit:
            silhouette = "Relaxed Top / Tapered Bottom"
        else:
            silhouette = "Contemporary Relaxed Drape"
    elif "slim" in top_fit:
        silhouette = "Streamlined Tailored Silhouette"
    else:
        silhouette = "Balanced Classic Proportion"

    # 3. Climate & Weather Comfort
    w = (weather or "mild").lower()
    if w in ["warm", "hot"]:
        weather_rating = "Light & Breathable (Warm Comfort)"
    elif w in ["cold", "chilly"]:
        weather_rating = "Structured Thermal Protection"
    else:
        weather_rating = "Transitional Mild Layering"

    # 4. Aesthetic Vibe
    occ = (occasion or "casual").lower()
    vibes = {
        "date": "Romantic Sophistication",
        "interview": "Professional Polish",
        "party": "Sharp Night-Out Edge",
        "college": "Effortless Streetwise",
        "casual": "Relaxed Everyday Chic"
    }
    style_vibe = vibes.get(occ, "Versatile Smart Casual")

    return {
        "color_contrast": color_contrast,
        "silhouette_balance": silhouette,
        "weather_rating": weather_rating,
        "style_vibe": style_vibe,
    }