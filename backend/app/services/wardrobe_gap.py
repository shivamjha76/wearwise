from collections import Counter


def recommend_next_item(wardrobe):
    if not wardrobe:
        return None

    tops = [
        item for item in wardrobe
        if item.category.lower() in [
            "tshirt",
            "t-shirt",
            "shirt",
            "top"
        ]
    ]

    bottoms = [
        item for item in wardrobe
        if item.category.lower() in [
            "jeans",
            "pants",
            "trousers",
            "bottom"
        ]
    ]

    shoes = [
        item for item in wardrobe
        if item.category.lower() in [
            "shoes",
            "sneakers"
        ]
    ]

    top_colors = Counter(
        item.color.lower() for item in tops
    )

    bottom_colors = Counter(
        item.color.lower() for item in bottoms
    )

    recommendations = []

    # Color gaps
    useful_top_colors = [
        "white",
        "black",
        "green",
        "blue",
        "maroon",
        "beige",
        "olive"
    ]

    for color in useful_top_colors:
        if top_colors[color] == 0:
            score = 0

            # A new color is more valuable
            score += 40

            # More bottoms = more combinations
            score += min(len(bottoms) * 10, 30)

            # Prefer colors that work with common bottoms
            if color in ["maroon", "beige", "olive"]:
                score += 20

            recommendations.append({
                "category": "shirt",
                "color": color,
                "score": min(score, 100),
                "reason": (
                    f"Adding a {color} shirt can introduce "
                    "a new color to your wardrobe and "
                    "create more outfit combinations."
                )
            })

    recommendations.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return recommendations[:3]