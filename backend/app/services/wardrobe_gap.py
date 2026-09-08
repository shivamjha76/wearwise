from collections import Counter


from collections import Counter
from itertools import product


TOP_CATEGORIES = ["tshirt", "t-shirt", "shirt", "top"]
BOTTOM_CATEGORIES = ["jeans", "pants", "trousers", "bottom"]
SHOE_CATEGORIES = ["shoes", "sneakers"]


COLOR_COMPATIBILITY = {
    "white": ["black", "blue", "beige", "grey", "green", "brown", "maroon"],
    "black": ["white", "blue", "beige", "grey", "green", "maroon"],
    "blue": ["white", "black", "beige", "grey", "brown"],
    "green": ["white", "black", "beige", "brown", "blue"],
    "maroon": ["white", "black", "beige", "grey", "blue"],
    "beige": ["white", "black", "blue", "green", "maroon", "brown"],
    "olive": ["white", "black", "beige", "brown"],
}


def is_color_compatible(color1, color2):
    color1 = color1.lower()
    color2 = color2.lower()

    if color1 == color2:
        return True

    return (
        color2 in COLOR_COMPATIBILITY.get(color1, [])
        or color1 in COLOR_COMPATIBILITY.get(color2, [])
    )


def count_new_combinations(
    new_top_color,
    bottoms,
    shoes
):
    count = 0

    for bottom, shoe in product(bottoms, shoes):

        if is_color_compatible(new_top_color, bottom.color):
            count += 1

    return count


def recommend_next_item(wardrobe):

    if not wardrobe:
        return None

    tops = [
        item for item in wardrobe
        if item.category.lower() in TOP_CATEGORIES
    ]

    bottoms = [
        item for item in wardrobe
        if item.category.lower() in BOTTOM_CATEGORIES
    ]

    shoes = [
        item for item in wardrobe
        if item.category.lower() in SHOE_CATEGORIES
    ]

    top_colors = Counter(
        item.color.lower()
        for item in tops
    )

    useful_top_colors = [
        "white",
        "black",
        "green",
        "blue",
        "maroon",
        "beige",
        "olive"
    ]

    recommendations = []

    for color in useful_top_colors:

        if top_colors[color] > 0:
            continue

        new_combinations = count_new_combinations(
            color,
            bottoms,
            shoes
        )

        score = min(
            40 + (new_combinations * 10),
            100
        )

        recommendations.append({
            "category": "shirt",
            "color": color,
            "score": score,
            "new_outfit_combinations": new_combinations,
            "reason": (
                f"A {color} shirt can create "
                f"{new_combinations} new outfit combinations "
                f"with your existing wardrobe."
            )
        })

    recommendations.sort(
        key=lambda x: (
            x["new_outfit_combinations"],
            x["score"]
        ),
        reverse=True
    )

    return recommendations[:3]