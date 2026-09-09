import os
import re
from typing import List, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

# Attempt to import OpenAI
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

api_key = os.getenv("OPENAI_API_KEY")
# Only enable client if it looks like a real API key (not empty or template string)
is_valid_key = bool(api_key and not api_key.startswith("your_") and len(api_key) > 20)
openai_client = OpenAI(api_key=api_key) if (OpenAI and is_valid_key) else None


def detect_occasion(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["date", "dinner", "romantic", "evening"]):
        return "date"
    if any(w in msg for w in ["interview", "formal", "office", "meeting", "business", "work", "presentation"]):
        return "interview"
    if any(w in msg for w in ["party", "club", "celebration", "birthday", "event", "night out"]):
        return "party"
    if any(w in msg for w in ["college", "campus", "class", "university", "school", "library"]):
        return "college"
    if any(w in msg for w in ["gym", "workout", "running", "jogging", "sports", "athletic"]):
        return "sport"
    return "casual"


def categorize_items(items):
    tops = []
    bottoms = []
    shoes = []

    for item in items:
        cat = (item.category or "").lower()
        if cat in ["tshirt", "t-shirt", "shirt", "hoodie", "sweater", "jacket", "top", "blazer", "polo"]:
            tops.append(item)
        elif cat in ["jeans", "pants", "trousers", "chinos", "shorts", "bottom", "joggers", "cargo"]:
            bottoms.append(item)
        elif cat in ["shoes", "sneakers", "boots", "loafers", "footwear"]:
            shoes.append(item)
        else:
            tops.append(item)

    return tops, bottoms, shoes


def generate_heuristic_advice(
    user_name: str,
    profile,
    wardrobe_items,
    message: str
) -> Tuple[str, List, str]:
    occasion = detect_occasion(message)
    msg_lower = message.lower()

    tops, bottoms, shoes = categorize_items(wardrobe_items)

    recommended_items = []

    # Check if user mentioned a specific color or item
    found_item = None
    for item in wardrobe_items:
        color_match = item.color.lower() in msg_lower if item.color else False
        cat_match = item.category.lower() in msg_lower if item.category else False
        if color_match and cat_match:
            found_item = item
            break
        elif color_match or cat_match:
            if not found_item:
                found_item = item

    # Pick best pieces based on occasion and user profile
    pref_style = (getattr(profile, "style_preference", None) or "casual").lower()
    pref_fit = (getattr(profile, "fit_preference", None) or "regular").lower()

    # Pick top
    selected_top = None
    if found_item and found_item in tops:
        selected_top = found_item
    elif tops:
        # Match occasion / style
        if occasion in ["interview", "formal"]:
            selected_top = next((t for t in tops if (t.category or "").lower() in ["shirt", "blazer", "polo"]), tops[0])
        elif occasion in ["party", "date"]:
            selected_top = next((t for t in tops if (t.color or "").lower() in ["black", "navy", "dark"] or (t.style or "").lower() in ["minimal", "streetwear"]), tops[0])
        else:
            selected_top = next((t for t in tops if (t.fit or "").lower() == pref_fit), tops[0])

    # Pick bottom
    selected_bottom = None
    if found_item and found_item in bottoms:
        selected_bottom = found_item
    elif bottoms:
        if occasion in ["interview", "formal"]:
            selected_bottom = next((b for b in bottoms if (b.category or "").lower() in ["trousers", "chinos", "pants"]), bottoms[0])
        else:
            selected_bottom = next((b for b in bottoms if (b.color or "").lower() in ["black", "blue", "navy", "grey"]), bottoms[0])

    # Pick shoes
    selected_shoes = None
    if found_item and found_item in shoes:
        selected_shoes = found_item
    elif shoes:
        if occasion in ["interview", "formal"]:
            selected_shoes = next((s for s in shoes if (s.category or "").lower() in ["loafers", "shoes"]), shoes[0])
        else:
            selected_shoes = next((s for s in shoes if (s.category or "").lower() in ["sneakers", "shoes"]), shoes[0])

    for piece in [selected_top, selected_bottom, selected_shoes]:
        if piece and piece not in recommended_items:
            recommended_items.append(piece)

    # Construct styling prose
    greeting = f"Hi {user_name}! " if user_name else "Hello! "
    
    # 1. Direct answer
    outfit_desc_parts = []
    if selected_top:
        outfit_desc_parts.append(f"your **{selected_top.color.title()} {selected_top.category.title()}**")
    if selected_bottom:
        outfit_desc_parts.append(f"your **{selected_bottom.color.title()} {selected_bottom.category.title()}**")
    if selected_shoes:
        outfit_desc_parts.append(f"your **{selected_shoes.color.title()} {selected_shoes.category.title()}**")

    if not outfit_desc_parts:
        reply = (
            f"{greeting}I'd love to style an outfit for you, but your wardrobe seems empty right now! "
            "Add a couple of tops, bottoms, and shoes in your **Wardrobe** tab first, and I'll immediately craft tailored looks from your clothes."
        )
        return reply, [], occasion

    outfit_summary = " paired with ".join(outfit_desc_parts)

    occasion_intros = {
        "date": "For a date or dinner outing, the secret is effortless sophistication — looking put-together without looking like you tried too hard.",
        "interview": "For an interview or professional setting, a crisp silhouette and clean neutral color palette inspire confidence and credibility.",
        "party": "For an evening party or celebration, a sleek, well-proportioned outfit with subtle contrast creates an eye-catching presence.",
        "college": "For everyday campus or casual wear, comfort and clean streetwear vibes are key for staying relaxed yet sharp all day.",
        "casual": "For a relaxed casual day, a balanced casual look gives you maximum comfort while keeping your aesthetic intentional."
    }

    intro = occasion_intros.get(occasion, occasion_intros["casual"])

    styling_points = []
    if selected_top and selected_bottom:
        styling_points.append(
            f"• **Color Balance:** Combining {selected_top.color.title()} on top with {selected_bottom.color.title()} bottoms provides a natural focal point that anchors your frame."
        )
    if pref_fit:
        styling_points.append(
            f"• **Proportions & Fit:** With your preference for a **{pref_fit}** fit, this pairing maintains clean lines without feeling restrictive."
        )
    if selected_shoes:
        styling_points.append(
            f"• **Footwear Finish:** Completing the ensemble with {selected_shoes.color.title()} {selected_shoes.category.title()} ties the look together smoothly."
        )

    pro_tips = {
        "date": "💡 **Stylist Pro-Tip:** Roll up the sleeves slightly or layer with a light jacket or minimalist fragrance for an elevated touch.",
        "interview": "💡 **Stylist Pro-Tip:** Make sure your collar is pressed and shoes are spotless — attention to detail always makes a lasting impression.",
        "party": "💡 **Stylist Pro-Tip:** Consider a minimalist silver or leather wrist accessory to give your outfit that final curated polish.",
        "college": "💡 **Stylist Pro-Tip:** A clean canvas tote or structured backpack complements this relaxed silhouette perfectly.",
        "casual": "💡 **Stylist Pro-Tip:** Keep accessories understated — clean white socks, sleek sunglasses, or a simple watch do wonders."
    }

    pro_tip = pro_tips.get(occasion, pro_tips["casual"])

    points_str = "\n".join(styling_points)

    reply = f"""{greeting}{intro}

From your wardrobe, I recommend wearing **{outfit_summary}**.

**Why this combination works:**
{points_str}

{pro_tip}"""

    return reply.strip(), recommended_items, occasion


def get_stylist_reply(
    user,
    profile,
    wardrobe_items,
    message: str,
    history: List[dict] = []
) -> Tuple[str, List, str]:
    occasion = detect_occasion(message)
    user_name = user.name if user else "Friend"

    # If OpenAI client is available, attempt LLM completion with fallback
    if openai_client:
        try:
            # Build inventory list for context
            inventory_lines = [
                f"- ID {item.id}: {item.color} {item.fit or ''} {item.category} ({item.style or 'casual'}, {item.pattern or 'solid'})"
                for item in wardrobe_items
            ]
            inventory_text = "\n".join(inventory_lines) if inventory_lines else "Wardrobe is currently empty."

            profile_desc = (
                f"- Height: {getattr(profile, 'height', 'N/A')} cm, Weight: {getattr(profile, 'weight', 'N/A')} kg\n"
                f"- Skin Tone: {getattr(profile, 'skin_tone', 'medium')}\n"
                f"- Preferred Style: {getattr(profile, 'style_preference', 'casual')}\n"
                f"- Preferred Fit: {getattr(profile, 'fit_preference', 'regular')}"
                if profile else "Profile not yet filled."
            )

            system_prompt = f"""You are WearWise Stylist, a chic, encouraging, highly perceptive personal fashion advisor and wardrobe stylist.
You are chatting with {user_name}.

USER'S STYLE PROFILE:
{profile_desc}

USER'S CURRENT WARDROBE INVENTORY:
{inventory_text}

INSTRUCTIONS:
1. Provide personalized, engaging, and practical fashion styling advice answering the user's question directly.
2. Recommend specific items from their wardrobe whenever appropriate. Citing their actual clothes makes the advice immediately actionable!
3. Explain color theory, silhouette, and why the pieces complement each other and the user's style preferences.
4. If you recommend specific wardrobe items from their inventory, specify their numeric IDs at the very end of your message on a single line in this exact format:
RECOMMENDED_ITEM_IDS: [id1, id2, id3]
5. Keep your tone fashionable, warm, modern, and concise (2-4 brief paragraphs)."""

            messages = [{"role": "system", "content": system_prompt}]

            # Add recent history (last 6 messages)
            for h in history[-6:]:
                role = "user" if h.get("role") == "user" else "assistant"
                content = h.get("content", "")
                if content:
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": message})

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=600
            )

            raw_reply = response.choices[0].message.content.strip()

            # Parse RECOMMENDED_ITEM_IDS: [1, 2, 3]
            rec_items = []
            id_match = re.search(r"RECOMMENDED_ITEM_IDS:\s*\[([^\]]*)\]", raw_reply)
            clean_reply = raw_reply

            if id_match:
                clean_reply = raw_reply[:id_match.start()].strip()
                id_strings = id_match.group(1).split(",")
                parsed_ids = set()
                for s in id_strings:
                    s_clean = s.strip()
                    if s_clean.isdigit():
                        parsed_ids.add(int(s_clean))

                item_map = {item.id: item for item in wardrobe_items}
                for pid in parsed_ids:
                    if pid in item_map:
                        rec_items.append(item_map[pid])

            # If no items were parsed from LLM, auto-select matching ones heuristically
            if not rec_items and wardrobe_items:
                _, heuristic_items, _ = generate_heuristic_advice(user_name, profile, wardrobe_items, message)
                rec_items = heuristic_items

            return clean_reply, rec_items, occasion

        except Exception as e:
            # Fall back to smart heuristic on any API error
            print("OpenAI stylist call failed or unconfigured, falling back to smart heuristics:", e)
            pass

    # Fallback to Smart Heuristic Stylist
    return generate_heuristic_advice(user_name, profile, wardrobe_items, message)
