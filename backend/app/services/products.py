PRODUCTS = [
    {
        "id": 1,
        "name": "Classic Maroon Shirt",
        "category": "shirt",
        "color": "maroon",
        "fit": "regular",
        "price": 899,
        "brand": "WearWise Picks",
        "image": "https://placehold.co/400x500?text=Maroon+Shirt"
    },
    {
        "id": 2,
        "name": "Beige Casual Shirt",
        "category": "shirt",
        "color": "beige",
        "fit": "relaxed",
        "price": 799,
        "brand": "WearWise Picks",
        "image": "https://placehold.co/400x500?text=Beige+Shirt"
    },
    {
        "id": 3,
        "name": "Olive Green Shirt",
        "category": "shirt",
        "color": "olive",
        "fit": "regular",
        "price": 849,
        "brand": "WearWise Picks",
        "image": "https://placehold.co/400x500?text=Olive+Shirt"
    },
    {
        "id": 4,
        "name": "Classic White Shirt",
        "category": "shirt",
        "color": "white",
        "fit": "regular",
        "price": 699,
        "brand": "WearWise Picks",
        "image": "https://placehold.co/400x500?text=White+Shirt"
    },
    {
        "id": 5,
        "name": "Black Casual Shirt",
        "category": "shirt",
        "color": "black",
        "fit": "relaxed",
        "price": 749,
        "brand": "WearWise Picks",
        "image": "https://placehold.co/400x500?text=Black+Shirt"
    }
]


def get_products_for_color(color: str):
    return [
        product
        for product in PRODUCTS
        if product["color"].lower() == color.lower()
    ]