PRODUCTS = [
    {
        "id": 1,
        "name": "Classic Maroon Shirt",
        "category": "shirt",
        "color": "maroon",
        "fit": "regular",
        "price": 899,
        "brand": "WearWise Picks",
        "image": "/products/classic_maroon_shirt.png"
    },
    {
        "id": 2,
        "name": "Beige Casual Shirt",
        "category": "shirt",
        "color": "beige",
        "fit": "relaxed",
        "price": 799,
        "brand": "WearWise Picks",
        "image": "/products/beige_casual_shirt.png"
    },
    {
        "id": 3,
        "name": "Olive Green Shirt",
        "category": "shirt",
        "color": "olive",
        "fit": "regular",
        "price": 849,
        "brand": "WearWise Picks",
        "image": "/products/olive_green_shirt.png"
    },
    {
        "id": 4,
        "name": "Classic White Shirt",
        "category": "shirt",
        "color": "white",
        "fit": "regular",
        "price": 699,
        "brand": "WearWise Picks",
        "image": "/products/classic_white_shirt.png"
    },
    {
        "id": 5,
        "name": "Black Casual Shirt",
        "category": "shirt",
        "color": "black",
        "fit": "relaxed",
        "price": 749,
        "brand": "WearWise Picks",
        "image": "/products/black_casual_shirt.png"
    },
    {
        "id": 6,
        "name": "Tailored Black Chinos",
        "category": "pants",
        "color": "black",
        "fit": "slim",
        "price": 1199,
        "brand": "WearWise Studio",
        "image": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80"
    },
    {
        "id": 7,
        "name": "Minimalist Beige Chinos",
        "category": "pants",
        "color": "beige",
        "fit": "regular",
        "price": 1099,
        "brand": "WearWise Studio",
        "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80"
    },
    {
        "id": 8,
        "name": "Straight Washed Indigo Denim",
        "category": "jeans",
        "color": "blue",
        "fit": "regular",
        "price": 1499,
        "brand": "WearWise Studio",
        "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80"
    },
    {
        "id": 9,
        "name": "Charcoal Pleated Trousers",
        "category": "pants",
        "color": "grey",
        "fit": "relaxed",
        "price": 1299,
        "brand": "WearWise Studio",
        "image": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&auto=format&fit=crop&q=80"
    },
    {
        "id": 10,
        "name": "Retro Court Low Sneakers",
        "category": "sneakers",
        "color": "white",
        "fit": "regular",
        "price": 1899,
        "brand": "WearWise Footwear",
        "image": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80"
    },
    {
        "id": 11,
        "name": "Matte Black Derby Shoes",
        "category": "shoes",
        "color": "black",
        "fit": "regular",
        "price": 1999,
        "brand": "WearWise Footwear",
        "image": "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=80"
    }
]


def get_products_for_color(color: str):
    matches = [
        product
        for product in PRODUCTS
        if product["color"].lower() == color.lower()
    ]
    return matches if matches else PRODUCTS[:2]


def get_products_for_recommendation(category: str, color: str):
    cat = (category or "").lower()
    col = (color or "").lower()

    # Exact category and color match
    exact = [
        p for p in PRODUCTS
        if p["category"].lower() == cat and p["color"].lower() == col
    ]
    if exact:
        return exact

    # Color match
    color_matches = [
        p for p in PRODUCTS
        if p["color"].lower() == col
    ]
    if color_matches:
        return color_matches

    # Category match
    cat_matches = [
        p for p in PRODUCTS
        if p["category"].lower() == cat
    ]
    if cat_matches:
        return cat_matches

    return PRODUCTS[:3]