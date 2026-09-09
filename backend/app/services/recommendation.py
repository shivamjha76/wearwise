from itertools import product


def score_outfit(
    top,
    bottom,
    shoes,
    profile,
    occasion,
    style_vibe=None
):
    score = 0

    # Normalize values
    top_style = (top.style or "").lower()
    bottom_style = (bottom.style or "").lower()
    shoes_style = (shoes.style or "").lower()

    top_color = (top.color or "").lower()
    bottom_color = (bottom.color or "").lower()

    profile_style = (profile.style_preference or "").lower()
    profile_fit = (profile.fit_preference or "").lower()
    occasion = occasion.lower()

    if style_vibe:
        style_vibe = style_vibe.lower()

    # --------------------------------
    # 1. Style compatibility
    # --------------------------------
    if top_style and top_style == bottom_style:
        score += 15

    if top_style and top_style == shoes_style:
        score += 10

    # --------------------------------
    # 2. User's preferred style
    # --------------------------------
    if top_style == profile_style:
        score += 10

    if bottom_style == profile_style:
        score += 5

    # --------------------------------
    # 3. Fit preference
    # --------------------------------
    if (top.fit or "").lower() == profile_fit:
        score += 10

    # --------------------------------
    # 4. Selected Style Vibe
    # --------------------------------
    if style_vibe:
        if top_style == style_vibe:
            score += 15

        if bottom_style == style_vibe:
            score += 10

        if shoes_style == style_vibe:
            score += 5

    # --------------------------------
    # 5. Occasion
    # --------------------------------
    if occasion in ["college", "casual"]:
        if top_style in ["casual", "streetwear"]:
            score += 15

        if bottom_style in ["casual", "streetwear"]:
            score += 10

    elif occasion == "interview":
        if top_style == "formal":
            score += 15

        if bottom_style == "formal":
            score += 10

        if shoes_style == "formal":
            score += 10

    elif occasion == "party":
        if top_style in ["casual", "streetwear"]:
            score += 10

        if bottom_style in ["casual", "streetwear"]:
            score += 10

    elif occasion == "date":
        if top_style in ["casual", "minimal", "formal"]:
            score += 10

        if bottom_style in ["casual", "minimal", "formal"]:
            score += 10

    # --------------------------------
    # 6. Color compatibility
    # --------------------------------
    compatible_colors = {
        "white": [
            "black",
            "blue",
            "beige",
            "grey",
            "green",
            "brown",
            "maroon",
        ],
        "black": [
            "white",
            "blue",
            "beige",
            "grey",
            "green",
            "maroon",
        ],
        "blue": [
            "white",
            "black",
            "beige",
            "grey",
        ],
        "green": [
            "white",
            "black",
            "beige",
            "brown",
        ],
        "maroon": [
            "black",
            "white",
            "beige",
            "blue",
        ],
        "beige": [
            "white",
            "black",
            "blue",
            "green",
            "brown",
        ],
        "grey": [
            "white",
            "black",
            "blue",
            "green",
        ],
        "brown": [
            "white",
            "beige",
            "green",
        ],
    }

    if bottom_color in compatible_colors.get(top_color, []):
        score += 15

    # --------------------------------
    # 7. Shoe color
    # --------------------------------
    if (shoes.color or "").lower() in ["white", "black"]:
        score += 5

    return min(score, 100)


def generate_outfits(
    wardrobe,
    profile,
    occasion,
    style_vibe=None
):
    tops = [
        item
        for item in wardrobe
        if item.category.lower()
        in ["tshirt", "t-shirt", "shirt", "top"]
    ]

    bottoms = [
        item
        for item in wardrobe
        if item.category.lower()
        in ["jeans", "pants", "trousers", "bottom"]
    ]

    shoes = [
        item
        for item in wardrobe
        if item.category.lower()
        in ["shoes", "sneakers"]
    ]

    outfits = []

    for top, bottom, shoe in product(
        tops,
        bottoms,
        shoes
    ):
        score = score_outfit(
            top,
            bottom,
            shoe,
            profile,
            occasion,
            style_vibe
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