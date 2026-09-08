import os

from dotenv import load_dotenv

try:
    from openai import OpenAI
except ModuleNotFoundError:  # pragma: no cover
    OpenAI = None

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if OpenAI is not None and api_key else None


def explain_outfit(
    top,
    bottom,
    shoes,
    profile,
    occasion
):
    if client is None:
        return (
            "This outfit is a good fit for the occasion because it keeps the look "
            "consistent with your preferred style, fit, and color palette. "
            "It balances comfort and presentation while staying aligned with your profile."
        )

    prompt = f"""
You are a helpful personal fashion assistant.

Explain why this outfit was recommended.

User:
- Height: {profile.height} cm
- Weight: {profile.weight} kg
- Skin tone: {profile.skin_tone}
- Preferred style: {profile.style_preference}
- Preferred fit: {profile.fit_preference}

Occasion:
{occasion}

Outfit:
- Top: {top.color} {top.fit} {top.category}
- Bottom: {bottom.color} {bottom.fit} {bottom.category}
- Shoes: {shoes.color} {shoes.category}

Give a short, practical explanation in 2-3 sentences.
Do not make medical or body-shaming claims.
Do not say that an outfit is objectively good or bad.
"""

    response = client.responses.create(
        model="gpt-5-mini",
        input=prompt
    )

    return response.output_text