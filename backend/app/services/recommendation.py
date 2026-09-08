from itertools import product


def score_outfit(top, bottom, shoes, profile, occasion):
    score = 0

    # 1. Style compatibility
    if top.style == bottom.style:
        score += 15

    if top.style == shoes.style:
        score += 10

    # 2. User style preference
    if top.style == profile.style_preference:
        score += 10

    if bottom.style == profile.style_preference:
        score += 5

    # 3. Fit preference
    if top.fit == profile.fit_preference:
        score += 10

    # 4. Occasion
    if occasion.lower() in ["college", "casual"]:
        if top.style in ["casual", "streetwear"]:
            score += 15

        if bottom.style in ["casual", "streetwear"]:
            score += 10

    elif occasion.lower() == "interview":
        if top.style == "formal":
            score += 15

        if bottom.style == "formal":
            score += 10

        if shoes.style == "formal":
            score += 10

    # 5. Basic color compatibility
    compatible_colors = {
        "white": ["black", "blue", "beige", "grey", "green", "brown"],
        "black": ["white", "blue", "beige", "grey", "green", "maroon"],
        "blue": ["white", "black", "beige", "grey"],
        "green": ["white", "black", "beige", "brown"],
        "maroon": ["black", "white", "beige", "blue"],
        "beige": ["white", "black", "blue", "green", "brown"],
        "grey": ["white", "black", "blue", "green"],
    }

    if bottom.color in compatible_colors.get(top.color, []):
        score += 15

    if shoes.color in ["white", "black"]:
        score += 5

    return min(score, 100)


def generate_outfits(wardrobe, profile, occasion):
    tops = [
        item for item in wardrobe
        if item.category.lower() in ["tshirt", "t-shirt", "shirt", "top"]
    ]

    bottoms = [
        item for item in wardrobe
        if item.category.lower() in ["jeans", "pants", "trousers", "bottom"]
    ]

    shoes = [
        item for item in wardrobe
        if item.category.lower() in ["shoes", "sneakers"]
    ]

    outfits = []

    for top, bottom, shoe in product(tops, bottoms, shoes):
        score = score_outfit(
            top,
            bottom,
            shoe,
            profile,
            occasion
        )

        outfits.append({
            "top": top,
            "bottom": bottom,
            "shoes": shoe,
            "score": score
        })

    outfits.sort(
        key=lambda outfit: outfit["score"],
        reverse=True
    )

    return outfits[:3]