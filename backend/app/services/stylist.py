from pathlib import Path
import os
import re
import json
import random
from typing import List, Optional, Tuple, Dict, Any
from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent
load_dotenv(APP_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")

try:
    import httpx
except ImportError:
    httpx = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


def is_valid_key(key: Optional[str]) -> bool:
    if not key:
        return False
    k = key.strip()
    return not (k.startswith("your_") or k.lower() == "none" or len(k) < 15)


def get_active_engine_info() -> Dict[str, Any]:
    """Returns information about the active LLM provider or fallback engine."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if is_valid_key(gemini_key):
        return {"engine": "gemini", "label": "Google Gemini", "online": True}


    openai_key = os.getenv("OPENAI_API_KEY")
    if is_valid_key(openai_key):
        return {"engine": "openai", "label": "OpenAI GPT-4o", "online": True}

    groq_key = os.getenv("GROQ_API_KEY")
    if is_valid_key(groq_key):
        return {"engine": "groq", "label": "Groq Llama 3.3", "online": True}

    return {"engine": "wearwise_ai", "label": "WearWise AI Engine", "online": True}


def save_api_key(provider: str, key: str) -> Dict[str, Any]:
    """Saves API key to runtime environment and persists to app .env file."""
    prov = provider.lower().strip()
    key_clean = key.strip()

    if prov == "gemini":
        os.environ["GEMINI_API_KEY"] = key_clean
        env_var = "GEMINI_API_KEY"
    elif prov == "openai":
        os.environ["OPENAI_API_KEY"] = key_clean
        env_var = "OPENAI_API_KEY"
    elif prov == "groq":
        os.environ["GROQ_API_KEY"] = key_clean
        env_var = "GROQ_API_KEY"
    else:
        raise ValueError(f"Unknown provider: {provider}")

    # Persist to backend/app/.env
    env_file = APP_DIR / ".env"
    if env_file.exists():
        content = env_file.read_text(encoding="utf-8")
        pattern = rf"^{env_var}=.*$"
        if re.search(pattern, content, flags=re.MULTILINE):
            new_content = re.sub(pattern, f"{env_var}={key_clean}", content, flags=re.MULTILINE)
        else:
            new_content = content.rstrip() + f"\n{env_var}={key_clean}\n"
        env_file.write_text(new_content, encoding="utf-8")

    return get_active_engine_info()


def detect_occasion(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["date", "dinner", "romantic", "evening", "girlfriend", "boyfriend"]):
        return "date"
    if any(w in msg for w in ["interview", "formal", "office", "meeting", "business", "work", "presentation"]):
        return "interview"
    if any(w in msg for w in ["party", "club", "celebration", "birthday", "event", "night out", "clubbing"]):
        return "party"
    if any(w in msg for w in ["college", "campus", "class", "university", "school", "library"]):
        return "college"
    if any(w in msg for w in ["gym", "workout", "running", "jogging", "sports", "athletic"]):
        return "sport"
    if any(w in msg for w in ["wedding", "shaadi", "reception", "traditional", "festival"]):
        return "wedding"
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


# =====================================================================
# INTENT CLASSIFIER FOR NATURAL CONVERSATIONAL EXPERIENCE
# =====================================================================

def classify_user_intent(message: str) -> str:
    """Classifies user input into communicative intent for natural chatbot behavior."""
    msg = message.strip().lower()

    # Clean punctuation
    cleaned = re.sub(r"[^\w\s]", " ", msg).strip()
    words = set(cleaned.split())

    # 1. Greetings
    greeting_words = {
        "hey", "hi", "hello", "hiya", "yo", "namaste", "hola", "sup", "wassup",
        "morning", "afternoon", "evening"
    }
    if words.intersection(greeting_words) and len(words) <= 4:
        return "greeting"
    if any(phrase in cleaned for phrase in [
        "good morning", "good evening", "good afternoon", "kaise ho", "kya haal",
        "kya haal hai", "aur bhai", "kya chal raha", "ram ram"
    ]):
        return "greeting"

    # 2. How are you / Chit chat
    if any(phrase in cleaned for phrase in [
        "how are you", "how r u", "how are u", "how do you do", "how is it going",
        "sab badiya", "sab theek"
    ]):
        return "how_are_you"

    # 3. Identity / Name / AI Query
    if any(phrase in cleaned for phrase in [
        "who are you", "what is your name", "what are you", "what r u", "who r u",
        "are you an ai", "are you ai", "are you chatgpt", "are you gemini",
        "tell me about yourself", "who made you", "intro", "introduce yourself"
    ]):
        return "identity"

    # 4. Capabilities / Help
    if any(phrase in cleaned for phrase in [
        "what can you do", "help", "how do you work", "what do you do", "features",
        "how can you help", "what should i ask", "kya kar sakte ho", "help me"
    ]) and len(words) <= 6:
        return "capabilities"

    # 5. Jokes / Humor
    if any(w in cleaned for w in ["joke", "funny", "make me laugh", "hasao"]):
        return "joke"

    # 6. Color Theory / Color Pairing
    if any(phrase in cleaned for phrase in [
        "what color goes with", "colors go with", "pair with", "pairs with",
        "color combination", "color harmony", "matching colors", "match with",
        "what to wear with beige", "what to wear with green", "what to wear with black",
        "what to wear with blue", "what to wear with brown", "what to wear with olive",
        "what to wear with grey", "what to wear with white", "what to wear with pink"
    ]):
        return "color_query"

    # 7. Garment-specific Styling Questions
    if any(phrase in cleaned for phrase in [
        "how to style", "how should i style", "how to wear", "how can i wear",
        "tips for styling", "ways to wear"
    ]):
        return "garment_styling"

    # 8. General Fashion Advice / Rules
    if any(phrase in cleaned for phrase in [
        "look taller", "look slim", "body type", "layering tips", "monochrome",
        "capsule wardrobe", "fashion rules", "styling tips", "pro tip"
    ]):
        return "fashion_advice"

    # 9. Outfit requests / What to wear
    outfit_triggers = [
        "what should i wear", "what to wear", "outfit", "recommend", "suggest an outfit",
        "pick an outfit", "style me", "style an outfit", "dress for", "dressing for",
        "going to", "date", "interview", "party", "college", "wedding", "shaadi",
        "clubbing", "gym", "meeting", "kya pehnu", "aaj kya pehnu", "dinner", "brunch"
    ]
    if any(trigger in cleaned for trigger in outfit_triggers):
        return "outfit_request"

    # Default to general styling dialogue
    return "general_dialogue"


# =====================================================================
# NATURAL CONVERSATIONAL FALLBACK ENGINE (ZERO-KEY CHATBOT)
# =====================================================================

COLOR_PAIRINGS = {
    "beige": {
        "pairs": ["Navy Blue", "Forest Green / Olive", "Crisp White", "Charcoal / Black", "Rich Burgundy"],
        "advice": "Beige is a sophisticated, versatile earth tone. Pairing it with deep navy provides crisp contrast, while olive green brings a refined, organic aesthetic."
    },
    "olive": {
        "pairs": ["Clean White", "Beige / Cream", "Navy Blue", "Mustard / Amber", "Black"],
        "advice": "Olive is a modern military-heritage neutral. It anchors effortlessly against white and cream, and looks exceptionally stylish layered with black."
    },
    "green": {
        "pairs": ["White", "Beige", "Navy", "Charcoal Grey", "Tan / Camel"],
        "advice": "Green brings natural vibrancy. Keep your secondary piece neutral (white or charcoal) to let the green garment be the tasteful hero of your look."
    },
    "black": {
        "pairs": ["Monochrome White & Grey", "Camel / Tan", "Cobalt Blue", "Olive Green", "Burgundy"],
        "advice": "Black is timeless and grounding. Avoid looking flat by mixing fabric textures (e.g., ribbed knits, raw denim, leather) or introducing crisp white contrast."
    },
    "blue": {
        "pairs": ["Tan / Brown", "White", "Grey", "Beige / Khaki", "Burgundy"],
        "advice": "Blue and brown is one of classic menswear's greatest color pairings. For casual looks, light blue tops with khaki bottoms or dark denim with white tops never fail."
    },
    "navy": {
        "pairs": ["White / Off-White", "Caramel / Tan", "Light Grey", "Burgundy", "Olive"],
        "advice": "Navy blue exudes confidence and composure. It serves as a softer, more dimensional alternative to pure black."
    },
    "brown": {
        "pairs": ["Light Blue", "Cream / Ivory", "Forest Green", "Navy", "Off-White"],
        "advice": "Brown brings cozy warmth and texture. Combining rich chocolate or camel with light blue or crisp cream creates an editorial, high-end look."
    },
    "grey": {
        "pairs": ["Burgundy", "Navy Blue", "Black", "Blush Pink", "Crisp White"],
        "advice": "Grey is the ultimate chameleon neutral. Charcoal pairs boldly with deep jewel tones, while heather grey shines with clean navy and white."
    },
    "white": {
        "pairs": ["Any Neutral", "Dark Indigo Denim", "Olive Green", "Black", "Pastels"],
        "advice": "White acts as the ultimate clean canvas. Ensure whites are kept bright and lint-free for an effortlessly elevated appearance."
    }
}


def find_matching_wardrobe_pieces(color_name: str, wardrobe_items) -> List[str]:
    """Finds items in user's wardrobe that match or pair well with a color."""
    matches = []
    color_lower = color_name.lower()
    for item in wardrobe_items:
        if (item.color or "").lower() == color_lower:
            matches.append(f"your **{item.color.title()} {item.category.title()}**")
    return matches[:3]


def generate_conversational_reply(
    user_name: str,
    profile,
    wardrobe_items,
    message: str,
    history: List[dict]
) -> Tuple[str, List, Optional[str]]:
    """
    Intelligent Conversational Dialogue Manager:
    Provides human-like, responsive, context-aware chatbot answers for any question,
    greeting, fashion theory, color question, or wardrobe styling request.
    """
    intent = classify_user_intent(message)
    msg_lower = message.lower()
    clean_name = user_name if user_name and user_name != "Friend" else ""
    greeting_prefix = f"Hey {clean_name}! 👋 " if clean_name else "Hey there! 👋 "

    # 1. GREETINGS
    if intent == "greeting":
        greetings = [
            f"{greeting_prefix}Great to see you! I'm your **WearWise AI Stylist**.\n\nHow can I help you today? You can ask me:\n• *\"What should I wear for a dinner date?\"*\n• *\"What colors pair best with beige chinos?\"*\n• *\"How should I style my sneakers?\"*\n• *\"Put together a casual outfit from my closet\"*",
            f"{greeting_prefix}Hope you're having an awesome day! I'm ready to help you look your best.\n\nAre you dressing for a specific event today, or looking for style tips from your wardrobe?",
            f"Hello{(' ' + clean_name) if clean_name else ''}! ✨ I'm your personal wardrobe stylist.\n\nWhether you need an outfit formula for work, an evening outing, or just want to explore fresh color combinations, let me know what you're thinking!"
        ]
        return random.choice(greetings), [], None

    # 2. HOW ARE YOU / CHIT-CHAT
    if intent == "how_are_you":
        return (
            f"I'm feeling sharp and ready to style, thanks for asking! 😊\n\n"
            f"How about you? Got any exciting plans coming up or an event you need an outfit for? "
            f"Tell me what's on your agenda, and we'll craft the perfect look."
        ), [], None

    # 3. IDENTITY / WHO ARE YOU
    if intent == "identity":
        return (
            f"I am your **WearWise AI Stylist** ✦ — your dedicated personal fashion consultant and digital wardrobe companion.\n\n"
            f"### Here is what I can do:\n"
            f"• **Closet Intelligence:** I know the garments in your digital wardrobe vault and match them to your personal aesthetic.\n"
            f"• **Context Styling:** I create outfits tailored for interviews, dates, college, gym, parties, or casual days.\n"
            f"• **Color & Proportion Rules:** I guide you on color harmonies, silhouette balance, and fit rules.\n"
            f"• **Endless Styling Advice:** Ask me about trends, footwear pairing, accessories, or styling dilemmas!\n\n"
            f"What would you like to explore first?"
        ), [], None

    # 4. CAPABILITIES / HELP
    if intent == "capabilities":
        return (
            f"Here are the main ways we can work together to elevate your wardrobe:\n\n"
            f"1. **Outfit Curation:** Ask *\"What should I wear to a dinner date?\"* or *\"Style an interview look\"*, and I'll assemble a complete top + bottom + footwear look from your closet.\n"
            f"2. **Color Harmony:** Ask *\"What colors go with olive green?\"* or *\"Can I wear brown shoes with black trousers?\"* for instant color theory rules.\n"
            f"3. **Garment Styling:** Ask *\"How should I style my white sneakers?\"* to get multiple ways to rock a specific piece.\n"
            f"4. **Fit & Silhouette Advice:** Tell me about your preferences, and I'll give advice tailored to your frame and vibe.\n\n"
            f"💡 **Tip:** Keep adding your clothes in the **Wardrobe** tab so I can style your real-world garments!"
        ), [], None

    # 5. JOKES / HUMOR
    if intent == "joke":
        jokes = [
            "Why did the belt get arrested? 🚔\nBecause it was holding up a pair of pants! 😄\n\nGot any real wardrobe challenges for me to solve today?",
            "Why do sweaters love hanging out with each other? 🧶\nBecause they're tight-knit! 😆\n\nSpeaking of knitwear, want some tips on layering sweaters this season?",
            "What did the hat say to the scarf? 🧣\n*\"You hang around here, I'll go on ahead!\"* 😂\n\nReady to put together an outfit that actually turns heads?"
        ]
        return random.choice(jokes), [], None

    # 6. COLOR THEORY / COLOR PAIRING QUERIES
    if intent == "color_query":
        detected_color = None
        for c in COLOR_PAIRINGS.keys():
            if c in msg_lower:
                detected_color = c
                break

        if detected_color:
            info = COLOR_PAIRINGS[detected_color]
            pairs_str = "\n".join([f"• **{p}**" for p in info["pairs"]])
            
            # Check user's wardrobe for matching pieces
            matching_closet = find_matching_wardrobe_pieces(detected_color, wardrobe_items)
            closet_note = ""
            if matching_closet:
                closet_note = f"\n\nFrom your closet, you already have {', '.join(matching_closet)} ready to pair with these shades!"

            reply = f"""### Styling with **{detected_color.title()}**

{info["advice"]}

**Top colors to pair with {detected_color.title()}:**
{pairs_str}
{closet_note}

💡 **Stylist Pro-Tip:** Anchor bold color contrasts with clean neutral footwear (like crisp white sneakers or classic black/brown leather loafers)."""
            return reply.strip(), [], None

        # General color theory explanation
        return (
            "### The 3 Golden Rules of Color Harmony in Fashion:\n\n"
            "1. **The 3-Color Rule:** Try not to wear more than 3 distinct colors at once. Two neutrals + one accent color creates an effortless, balanced aesthetic.\n"
            "2. **Analogous vs Complementary:** Analogous colors (like olive and beige, or navy and light blue) create subtle, sophisticated flow. Complementary colors (like navy and caramel) create striking, confident visual punch.\n"
            "3. **Tonal / Monochrome:** Wearing different shades and textures of the same color family (e.g. charcoal + heather grey + off-white) creates an elongating, high-fashion silhouette.\n\n"
            "Ask me about any specific color (e.g. *\"What goes with beige?\"* or *\"How to style olive pants?\"*) and I'll give you exact pairing formulas!"
        ), [], None

    # 7. GARMENT STYLING
    if intent == "garment_styling":
        if "sneaker" in msg_lower or "shoe" in msg_lower:
            return (
                "### 3 Ways to Elevate Your Sneakers:\n\n"
                "1. **The Smart-Casual Move:** Pair low-profile white or neutral sneakers with tailored chinos or pleated trousers and an untucked crisp button-down or overshirt.\n"
                "2. **The Modern Streetwear Silhouette:** Rock chunky or retro trainers with relaxed/loose-fit denim and an oversized hoodie or tee.\n"
                "3. **Minimalist Monochrome:** Keep the whole look in shades of black, grey, and charcoal to let clean sneakers serve as an intentional anchor.\n\n"
                "💡 **Stylist Pro-Tip:** Keep sneaker outsoles clean — spotless footwear instantly makes the most relaxed outfit look deliberate."
            ), [], None

        if "hoodie" in msg_lower or "sweatshirt" in msg_lower:
            return (
                "### How to Style a Hoodie Like a Fashion Pro:\n\n"
                "1. **High-Low Layering:** Layer a structured overcoat, denim trucker jacket, or tailored blazer over a clean solid hoodie. The contrast between casual and structured looks incredible.\n"
                "2. **Proportion Play:** Pair an oversized hoodie with straight-leg or relaxed trousers (avoid overly skin-tight jeans for a balanced silhouette).\n"
                "3. **Minimalist Aesthetic:** Stick to neutral shades (heather grey, charcoal, sage, or washed black) with minimal or no loud branding.\n\n"
                "💡 **Stylist Pro-Tip:** Make sure the hoodie hood stands up cleanly over your jacket collar rather than bunching inside."
            ), [], None

        if "blazer" in msg_lower or "suit" in msg_lower or "jacket" in msg_lower:
            return (
                "### How to Style a Blazer Casually:\n\n"
                "1. **With a Crisp Tee:** Ditch the formal dress shirt and wear a clean, high-neck white or black crewneck T-shirt underneath.\n"
                "2. **With Dark Denim or Chinos:** Replace matching suit trousers with dark raw indigo jeans or beige chinos for the ultimate smart-casual balance.\n"
                "3. **Footwear Twist:** Finish with minimalist leather sneakers or clean suede loafers instead of formal patent shoes."
            ), [], None

    # 8. FASHION ADVICE / PROPORTIONS
    if intent == "fashion_advice":
        if "taller" in msg_lower:
            return (
                "### Proven Ways to Look Taller with Your Clothes:\n\n"
                "1. **High-Waisted / Mid-Rise Bottoms:** Wearing trousers sitting at your natural waist rather than hips visibly elongates your leg line.\n"
                "2. **Monochrome / Tonal Dressing:** Keeping your top and bottom in similar tonal shades creates an unbroken vertical line that draws the eye upward.\n"
                "3. **Vertical Details:** Opt for vertical stripes, open jackets that frame a central line, or unbuttoned overshirts.\n"
                "4. **Matching Shoes to Trousers:** Wearing black shoes with black pants or white sneakers with light trousers avoids visually breaking your leg at the ankle."
            ), [], None

        if "layer" in msg_lower:
            return (
                "### The Ultimate Guide to Layering:\n\n"
                "• **Thin to Thick:** Always start with the lightest fabric closest to your body (e.g., cotton tee → flannel overshirt → wool coat).\n"
                "• **Collar Stacking:** Alternate collar styles so they don't fight each other (crewneck tee + buttoned shirt + collarless jacket).\n"
                "• **Hem Lengths:** Let your base layer peek out 1-2 inches beneath a cropped sweater or hoodie for intentional street-style depth."
            ), [], None

    # 9. OUTFIT RECOMMENDATIONS / WHAT TO WEAR
    occasion = detect_occasion(message)

    # If user has an empty wardrobe and explicitly requested an outfit:
    if not wardrobe_items:
        occasion_guides = {
            "date": "For a date, an unbeatable formula is a dark tailored overshirt (navy or black) over a clean white crewneck tee, paired with slim-straight dark denim or chinos and minimalist leather sneakers.",
            "interview": "For an interview, a pressed light blue or crisp white button-down shirt paired with tailored charcoal or navy trousers and clean dress shoes or leather loafers inspires immediate confidence.",
            "party": "For a party, a textured black polo or camp-collar shirt paired with relaxed black trousers and statement sneakers gives you effortless charisma.",
            "college": "For college or campus, an oversized neutral hoodie or relaxed graphic tee paired with straight-leg denim and versatile sneakers offers maximum all-day comfort.",
            "casual": "For a relaxed casual day, combine a quality crewneck tee with comfortable chinos or relaxed jeans and clean sneakers."
        }
        guide = occasion_guides.get(occasion, occasion_guides["casual"])

        reply = f"""### Outfit Direction for **{occasion.title()}**:

{guide}

💡 **Connect Your Wardrobe:** Your digital closet is currently empty! Once you upload or add a few tops, bottoms, and shoes in your **Wardrobe** tab, I will automatically curate and show real outfit cards straight from your closet!"""
        return reply.strip(), [], occasion

    # User has clothes! Build heuristic look:
    return generate_heuristic_advice(user_name, profile, wardrobe_items, message)


def generate_heuristic_advice(
    user_name: str,
    profile,
    wardrobe_items,
    message: str
) -> Tuple[str, List, str]:
    """Generates an outfit recommendation referencing user's actual clothes."""
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

    clean_name = user_name if user_name and user_name != "Friend" else ""
    greeting = f"Here is a curated outfit for you{(' ' + clean_name) if clean_name else ''}!"

    outfit_desc_parts = []
    if selected_top:
        outfit_desc_parts.append(f"your **{selected_top.color.title()} {selected_top.category.title()}**")
    if selected_bottom:
        outfit_desc_parts.append(f"your **{selected_bottom.color.title()} {selected_bottom.category.title()}**")
    if selected_shoes:
        outfit_desc_parts.append(f"your **{selected_shoes.color.title()} {selected_shoes.category.title()}**")

    outfit_summary = " paired with ".join(outfit_desc_parts)

    occasion_intros = {
        "date": "For a date or evening out, effortless sophistication is key — structured lines with comfortable ease.",
        "interview": "For an interview or professional setting, a crisp silhouette and clean neutral color palette inspire confidence.",
        "party": "For an evening party, a sleek outfit with subtle tonal contrast makes a memorable, stylish presence.",
        "college": "For college and daily errands, comfort and clean streetwear proportions keep you sharp all day.",
        "casual": "For a relaxed casual day, a balanced ensemble gives you maximum comfort while keeping your aesthetic intentional."
    }

    intro = occasion_intros.get(occasion, occasion_intros["casual"])

    styling_points = []
    if selected_top and selected_bottom:
        styling_points.append(
            f"• **Color Balance:** Combining {selected_top.color.title()} on top with {selected_bottom.color.title()} bottoms creates a natural, flattering focal point."
        )
    if pref_fit:
        styling_points.append(
            f"• **Silhouette & Fit:** Emphasizing your preferred **{pref_fit}** fit maintains clean lines without looking oversized or tight."
        )
    if selected_shoes:
        styling_points.append(
            f"• **Footwear Anchor:** Finishing the look with {selected_shoes.color.title()} {selected_shoes.category.title()} grounds the silhouette."
        )

    pro_tips = {
        "date": "💡 **Stylist Pro-Tip:** Roll up the cuffs or overshirt sleeves slightly and wear a subtle woody fragrance for an elevated touch.",
        "interview": "💡 **Stylist Pro-Tip:** Ensure the collar is crisp and shoes are spotless — attention to small details conveys professionalism.",
        "party": "💡 **Stylist Pro-Tip:** A minimalist leather watch or simple silver wrist accessory gives your outfit the final curated polish.",
        "college": "💡 **Stylist Pro-Tip:** A clean structured backpack or tote bag complements this relaxed silhouette smoothly.",
        "casual": "💡 **Stylist Pro-Tip:** Keep accessories simple — clean white socks, sleek sunglasses, or a minimalist cap do wonders."
    }

    pro_tip = pro_tips.get(occasion, pro_tips["casual"])
    points_str = "\n".join(styling_points)

    reply = f"""{greeting} {intro}

From your wardrobe, I recommend wearing **{outfit_summary}**.

**Why this combination works:**
{points_str}

{pro_tip}"""

    return reply.strip(), recommended_items, occasion


# =====================================================================
# LLM DISPATCHER (GOOGLE GEMINI, OPENAI, GROQ)
# =====================================================================

def call_gemini_api(
    api_key: str,
    system_prompt: str,
    message: str,
    history: List[dict]
) -> Optional[str]:
    """Calls Google Gemini API via official REST endpoint."""
    if not httpx:
        return None

    models_to_try = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
    ]


    contents = []
    for h in history[-8:]:
        role = "user" if h.get("role") == "user" else "model"
        text = (h.get("content") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 800
        }
    }

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            with httpx.Client(trust_env=False, timeout=35.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                else:
                    print(f"Gemini API returned status {res.status_code} for {model}: {res.text[:200]}")
        except Exception as e:
            print(f"Error calling Gemini {model}: {e}")

    return None


def call_openai_api(
    api_key: str,
    system_prompt: str,
    message: str,
    history: List[dict]
) -> Optional[str]:
    """Calls OpenAI API (gpt-4o-mini)."""
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        role = "user" if h.get("role") == "user" else "assistant"
        content = (h.get("content") or "").strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    if OpenAI:
        try:
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=750
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI SDK call failed: {e}")

    if httpx:
        try:
            with httpx.Client(trust_env=False, timeout=30.0) as client:
                res = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 750
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"OpenAI REST call failed: {e}")

    return None


def call_groq_api(
    api_key: str,
    system_prompt: str,
    message: str,
    history: List[dict]
) -> Optional[str]:
    """Calls Groq Cloud API for ultra-fast Llama 3.3 inference."""
    if not httpx:
        return None

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        role = "user" if h.get("role") == "user" else "assistant"
        content = (h.get("content") or "").strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        with httpx.Client(trust_env=False, timeout=30.0) as client:
            res = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            )
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Groq API call failed: {e}")

    return None


# =====================================================================
# MAIN STYLIST CHAT ENTRYPOINT
# =====================================================================

def get_stylist_reply(
    user,
    profile,
    wardrobe_items,
    message: str,
    history: List[dict] = []
) -> Tuple[str, List, Optional[str], str]:
    """
    Main dialogue router:
    1. Checks for configured LLMs (Gemini, OpenAI, Groq).
    2. Sends full conversational prompt & history to LLM.
    3. If no LLM configured or external call fails, seamlessly falls back to
       our rich Conversational Fashion NLU Engine.
    4. Returns: (reply, recommended_items, occasion, engine_name)
    """
    user_name = user.name if user else "Friend"
    occasion = detect_occasion(message)
    engine_info = get_active_engine_info()
    engine_type = engine_info["engine"]

    # Build inventory lines for model context
    inventory_lines = [
        f"- ID {item.id}: {item.color} {item.fit or ''} {item.category} ({item.style or 'casual'}, {item.pattern or 'solid'})"
        for item in wardrobe_items
    ]
    inventory_text = "\n".join(inventory_lines) if inventory_lines else "Wardrobe vault is currently empty."

    profile_desc = (
        f"- Height: {getattr(profile, 'height', 'N/A')} cm, Weight: {getattr(profile, 'weight', 'N/A')} kg\n"
        f"- Skin Tone: {getattr(profile, 'skin_tone', 'medium')}\n"
        f"- Preferred Style: {getattr(profile, 'style_preference', 'casual')}\n"
        f"- Preferred Fit: {getattr(profile, 'fit_preference', 'regular')}"
        if profile else "Profile not yet filled."
    )

    system_prompt = f"""You are WearWise AI Stylist, an intelligent, modern, encouraging, and highly versatile conversational AI chatbot (like ChatGPT and Gemini) with deep expertise in fashion, wardrobe styling, and lifestyle aesthetics.
You are chatting with {user_name}.

USER'S STYLE PROFILE:
{profile_desc}

USER'S CURRENT WARDROBE INVENTORY:
{inventory_text}

INSTRUCTIONS & BEHAVIOR:
1. COMPLETE CONVERSATIONAL FREEDOM (CHATGPT / GEMINI STYLE):
   - You are a fully capable AI assistant! You can talk about ANYTHING the user wants:
     * Everyday conversations, greetings, how are you, personal thoughts
     * General knowledge, science, life advice, food, tech, travel, jokes, stories
     * Fashion styling, color theory, outfit formulas, shopping tips, fabric care
   - Give direct, helpful, engaging, and relevant answers to WHATEVER the user asks or says.
   - If the user writes in Hindi or Hinglish, converse effortlessly in friendly Hinglish/English.
   - Never say "I can only talk about clothes" — converse naturally like ChatGPT or Gemini on any topic, while retaining your charming, stylish personality!

2. WARDROBE OUTFIT RECOMMENDATIONS:
   - When the user explicitly asks for an outfit recommendation, what to wear for an occasion/event, or how to style a specific piece:
     * Check their wardrobe inventory above and assemble a look using their real clothes whenever possible!
     * Explain why the colors and fit complement each other and suit the occasion.
     * Append the recommended item numeric IDs at the very end on a new line:
       RECOMMENDED_ITEM_IDS: [id1, id2, id3]
   - If the user did NOT ask for an outfit, DO NOT include RECOMMENDED_ITEM_IDS.
   - If their wardrobe is empty and they ask what to wear, suggest general outfit combinations and gently invite them to add items to their Wardrobe tab.

3. FORMATTING:
   - Use beautiful, readable Markdown (clean bullet points, bold key terms, and line breaks)."""


    llm_reply = None

    if engine_type == "gemini":
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        llm_reply = call_gemini_api(gemini_key, system_prompt, message, history)
    elif engine_type == "openai":
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        llm_reply = call_openai_api(openai_key, system_prompt, message, history)
    elif engine_type == "groq":
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        llm_reply = call_groq_api(groq_key, system_prompt, message, history)

    if llm_reply:
        # Parse RECOMMENDED_ITEM_IDS: [1, 2, 3] if present
        rec_items = []
        id_match = re.search(r"RECOMMENDED_ITEM_IDS:\s*\[([^\]]*)\]", llm_reply)
        clean_reply = llm_reply

        if id_match:
            clean_reply = llm_reply[:id_match.start()].strip()
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

        # If user explicitly asked for an outfit recommendation but LLM forgot IDs,
        # fallback to heuristic item picking ONLY for outfit requests
        intent = classify_user_intent(message)
        if intent == "outfit_request" and not rec_items and wardrobe_items:
            _, heuristic_items, _ = generate_heuristic_advice(user_name, profile, wardrobe_items, message)
            rec_items = heuristic_items

        return clean_reply, rec_items, occasion, engine_type

    # Fallback to Conversational Fashion NLU Engine
    reply, rec_items, occ = generate_conversational_reply(
        user_name=user_name,
        profile=profile,
        wardrobe_items=wardrobe_items,
        message=message,
        history=history
    )
    return reply, rec_items, occ, "wearwise_ai"

