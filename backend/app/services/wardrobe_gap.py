from collections import Counter
from itertools import product


TOP_CATEGORIES = [
    "tshirt", "t-shirt", "shirt", "top", "polo", "hoodie", "sweater", "jacket", "blazer"
]
BOTTOM_CATEGORIES = [
    "jeans", "pants", "trousers", "chinos", "shorts", "bottom", "joggers", "cargo"
]
SHOE_CATEGORIES = [
    "shoes", "sneakers", "boots", "loafers", "footwear"
]

COLOR_COMPATIBILITY = {
    "white": ["black", "blue", "beige", "grey", "green", "brown", "maroon"],
    "black": ["white", "blue", "beige", "grey", "green", "maroon"],
    "blue": ["white", "black", "beige", "grey", "brown"],
    "green": ["white", "black", "beige", "brown", "blue"],
    "maroon": ["white", "black", "beige", "grey", "blue"],
    "beige": ["white", "black", "blue", "green", "maroon", "brown"],
    "olive": ["white", "black", "beige", "brown"],
    "grey": ["white", "black", "blue", "green"],
    "brown": ["white", "beige", "green", "blue"],
}


def is_color_compatible(color1: str, color2: str) -> bool:
    c1 = (color1 or "").lower()
    c2 = (color2 or "").lower()

    if not c1 or not c2:
        return False

    if c1 == c2:
        return True

    return (
        c2 in COLOR_COMPATIBILITY.get(c1, [])
        or c1 in COLOR_COMPATIBILITY.get(c2, [])
    )


def _get_val(item, field: str, default: str = "") -> str:
    if isinstance(item, dict):
        return str(item.get(field) or default)
    return str(getattr(item, field, default) or default)


def count_new_combinations_for_top(new_top_color: str, bottoms, shoes) -> int:
    count = 0
    if not bottoms or not shoes:
        available = bottoms if bottoms else shoes
        for item in available:
            if is_color_compatible(new_top_color, _get_val(item, "color")):
                count += 1
        return max(count, 1) if available else 1

    for bottom, _ in product(bottoms, shoes):
        if is_color_compatible(new_top_color, _get_val(bottom, "color")):
            count += 1
    return count


def count_new_combinations_for_bottom(new_bottom_color: str, tops, shoes) -> int:
    count = 0
    if not tops or not shoes:
        available = tops if tops else shoes
        for item in available:
            if is_color_compatible(_get_val(item, "color"), new_bottom_color):
                count += 1
        return max(count, 1) if available else 1

    for top, _ in product(tops, shoes):
        if is_color_compatible(_get_val(top, "color"), new_bottom_color):
            count += 1
    return count


def count_new_combinations_for_shoes(new_shoe_color: str, tops, bottoms) -> int:
    count = 0
    if not tops or not bottoms:
        available = tops if tops else bottoms
        for item in available:
            if is_color_compatible(_get_val(item, "color"), new_shoe_color):
                count += 1
        return max(count, 1) if available else 1

    for top, bottom in product(tops, bottoms):
        top_color = _get_val(top, "color")
        bottom_color = _get_val(bottom, "color")
        if is_color_compatible(top_color, bottom_color) and (
            is_color_compatible(new_shoe_color, bottom_color) or is_color_compatible(new_shoe_color, top_color)
        ):
            count += 1
    return count


def recommend_next_item(wardrobe):
    if not wardrobe:
        return []

    tops = [
        item for item in wardrobe
        if _get_val(item, "category").lower() in TOP_CATEGORIES
    ]

    bottoms = [
        item for item in wardrobe
        if _get_val(item, "category").lower() in BOTTOM_CATEGORIES
    ]

    shoes = [
        item for item in wardrobe
        if _get_val(item, "category").lower() in SHOE_CATEGORIES
    ]

    top_colors = Counter(_get_val(item, "color").lower() for item in tops)
    bottom_colors = Counter(_get_val(item, "color").lower() for item in bottoms)
    shoe_colors = Counter(_get_val(item, "color").lower() for item in shoes)

    recommendations = []

    # 1. Evaluate missing bottoms (high priority anchor)
    useful_bottom_colors = ["black", "beige", "blue", "grey"]
    for color in useful_bottom_colors:
        if bottom_colors[color] == 0 and (tops or shoes):
            new_combinations = count_new_combinations_for_bottom(color, tops, shoes)
            if new_combinations > 0:
                score = min(50 + (new_combinations * 10), 100)
                cat_name = "pants" if color in ["black", "grey", "beige"] else "jeans"
                recommendations.append({
                    "category": cat_name,
                    "color": color,
                    "score": score,
                    "new_outfit_combinations": new_combinations,
                    "reason": (
                        f"Adding {color} {cat_name} anchors your rotation and instantly "
                        f"unlocks {new_combinations} complete outfit formulas with your current pieces."
                    )
                })

    # 2. Evaluate missing footwear
    useful_shoe_colors = ["white", "black"]
    for color in useful_shoe_colors:
        if shoe_colors[color] == 0 and (tops or bottoms):
            new_combinations = count_new_combinations_for_shoes(color, tops, bottoms)
            if new_combinations > 0:
                score = min(50 + (new_combinations * 8), 100)
                cat_name = "sneakers" if color == "white" else "shoes"
                recommendations.append({
                    "category": cat_name,
                    "color": color,
                    "score": score,
                    "new_outfit_combinations": new_combinations,
                    "reason": (
                        f"Minimalist {color} {cat_name} cleanly finish {new_combinations} outfits "
                        f"across your wardrobe with zero color clashing."
                    )
                })

    # 3. Evaluate missing tops
    useful_top_colors = ["white", "black", "beige", "blue", "olive", "maroon", "green"]
    for color in useful_top_colors:
        if top_colors[color] == 0 and (bottoms or shoes):
            new_combinations = count_new_combinations_for_top(color, bottoms, shoes)
            if new_combinations > 0:
                score = min(40 + (new_combinations * 10), 100)
                recommendations.append({
                    "category": "shirt",
                    "color": color,
                    "score": score,
                    "new_outfit_combinations": new_combinations,
                    "reason": (
                        f"A versatile {color} shirt pairs harmoniously with your existing wardrobe, "
                        f"unlocking {new_combinations} fresh look combinations."
                    )
                })

    if not recommendations:
        recommendations = [
            {
                "category": "shirt",
                "color": "white",
                "score": 95,
                "new_outfit_combinations": 5,
                "reason": "A crisp white button-down shirt is the most versatile foundational piece in menswear."
            },
            {
                "category": "pants",
                "color": "black",
                "score": 90,
                "new_outfit_combinations": 4,
                "reason": "Tailored black trousers provide a neutral base that pairs with virtually any upper layer."
            },
            {
                "category": "sneakers",
                "color": "white",
                "score": 88,
                "new_outfit_combinations": 4,
                "reason": "Clean white sneakers finish any outfit with modern, elevated minimalism."
            }
        ]

    # Sort all candidates by combination impact and score
    recommendations.sort(
        key=lambda x: (x["new_outfit_combinations"], x["score"]),
        reverse=True
    )

    return recommendations[:3]