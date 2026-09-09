import os

from dotenv import load_dotenv

try:
    from openai import OpenAI
except ModuleNotFoundError:  # pragma: no cover
    OpenAI = None

load_dotenv()

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
    if client is None:
        return _heuristic_explanation(top, bottom, shoes, profile, occasion, weather)

    weather_desc = f"- Weather: {weather}" if weather else ""

    prompt = f"""You are a helpful personal fashion assistant.

Explain why this outfit was recommended.

User:
- Height: {getattr(profile, 'height', 'N/A')} cm
- Weight: {getattr(profile, 'weight', 'N/A')} kg
- Skin tone: {getattr(profile, 'skin_tone', 'medium')}
- Preferred style: {getattr(profile, 'style_preference', 'casual')}
- Preferred fit: {getattr(profile, 'fit_preference', 'regular')}

Occasion:
{occasion}
{weather_desc}

Outfit:
- Top: {top.color} {top.fit or ''} {top.category}
- Bottom: {bottom.color} {bottom.fit or ''} {bottom.category}
- Shoes: {shoes.color} {shoes.category}

Give a short, practical explanation in 2-3 sentences.
Do not make medical or body-shaming claims.
Do not say that an outfit is objectively good or bad."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise, perceptive personal fashion stylist assistant. Explain why an outfit works well in 2-3 sentences."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        print("OpenAI outfit explanation failed, falling back to heuristics:", exc)
        return _heuristic_explanation(top, bottom, shoes, profile, occasion, weather)