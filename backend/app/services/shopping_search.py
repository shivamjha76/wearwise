"""
WearWise AI Shopping Discovery Service
Aggregates and recommends real fashion pieces across Indian & global fashion platforms:
- Myntra
- Flipkart
- Ajio
- Meesho
- H&M, Uniqlo, Zara, Levi's, Nike, Fossil
"""

from typing import List, Dict, Any, Optional
import urllib.parse

# Real base search URLs for direct in-store landing
STORE_URL_BUILDERS = {
    "Myntra": lambda q: f"https://www.myntra.com/{urllib.parse.quote(q.replace(' ', '-'))}",
    "Flipkart": lambda q: f"https://www.flipkart.com/search?q={urllib.parse.quote(q)}",
    "Ajio": lambda q: f"https://www.ajio.com/search/?text={urllib.parse.quote(q)}",
    "Meesho": lambda q: f"https://www.meesho.com/search?q={urllib.parse.quote(q)}",
    "H&M": lambda q: f"https://www2.hm.com/en_in/search-results.html?q={urllib.parse.quote(q)}",
    "Uniqlo": lambda q: f"https://www.uniqlo.com/in/en/search/?q={urllib.parse.quote(q)}",
    "Zara": lambda q: f"https://www.zara.com/in/en/search?searchTerm={urllib.parse.quote(q)}",
    "Nike": lambda q: f"https://www.nike.com/in/w?q={urllib.parse.quote(q)}",
}

# Rich curated database of high-rated, essential wardrobe items
CURATED_STORE_PRODUCTS: List[Dict[str, Any]] = [
    # ==================== FEATURED FROM MOCKUP ====================
    {
        "id": "hm-wht-sh-01",
        "name": "Regular Fit Shirt",
        "category": "shirt",
        "group": "Topwear",
        "color": "white",
        "fit": "regular",
        "price": 1799,
        "original_price": 2299,
        "discount_percent": 22,
        "rating": 4.5,
        "reviews_count": 5420,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/shirts/hm/hm-men-white-regular-fit-cotton-shirt/1489211/buy",
        "image": "/shop/products/hm_shirt.png",
        "brand": "H&M",
        "badge": "Wardrobe Essential",
        "reason": "A clean white button-down anchors any rotation, pairing seamlessly with dark denim or tailored chinos."
    },
    {
        "id": "uq-blk-tee-01",
        "name": "Oversized T-Shirt",
        "category": "tshirt",
        "group": "Topwear",
        "color": "black",
        "fit": "oversized",
        "price": 999,
        "original_price": 1490,
        "discount_percent": 33,
        "rating": 4.7,
        "reviews_count": 8920,
        "store": "Ajio",
        "store_url": "https://www.ajio.com/search/?text=Uniqlo+AIRism+Cotton+Oversized+T-Shirt",
        "image": "/shop/products/uniqlo_tee.png",
        "brand": "Uniqlo",
        "badge": "Top Rated",
        "reason": "Heavyweight matte cotton drape with clean drop shoulders for modern minimalist styling."
    },
    {
        "id": "lev-blu-jns-01",
        "name": "Straight Fit Jeans",
        "category": "jeans",
        "group": "Bottomwear",
        "color": "blue",
        "fit": "straight",
        "price": 2499,
        "original_price": 3999,
        "discount_percent": 38,
        "rating": 4.6,
        "reviews_count": 12400,
        "store": "Flipkart",
        "store_url": "https://www.flipkart.com/search?q=Levis+Men+Straight+Fit+Mid+Blue+Jeans",
        "image": "/shop/products/levis_jeans.png",
        "brand": "Levi's",
        "badge": "Iconic Denim",
        "reason": "Authentic stone-wash blue straight jeans that effortlessly ground casual and smart-casual looks."
    },
    {
        "id": "nk-wht-snk-01",
        "name": "Air Force 1",
        "category": "sneakers",
        "group": "Footwear",
        "color": "white",
        "fit": "regular",
        "price": 7495,
        "original_price": 8195,
        "discount_percent": 9,
        "rating": 4.8,
        "reviews_count": 34100,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/casual-shoes/nike/nike-men-air-force-1-07-sneakers/1298412/buy",
        "image": "/shop/products/nike_af1.png",
        "brand": "Nike",
        "badge": "Holy Grail",
        "reason": "The quintessential all-white court sneaker that completes 95% of casual and streetwear outfits."
    },
    {
        "id": "zr-blk-jkt-01",
        "name": "Utility Jacket",
        "category": "jacket",
        "group": "Outerwear",
        "color": "black",
        "fit": "relaxed",
        "price": 3990,
        "original_price": 4990,
        "discount_percent": 20,
        "rating": 4.5,
        "reviews_count": 2180,
        "store": "Ajio",
        "store_url": "https://www.ajio.com/search/?text=Zara+Men+Black+Utility+Jacket",
        "image": "/shop/products/zara_jacket.png",
        "brand": "Zara",
        "badge": "Stylist Pick",
        "reason": "Structured black workwear layer that adds sharp silhouettes and functional depth to plain t-shirts."
    },
    {
        "id": "hm-beg-trs-01",
        "name": "Relaxed Fit Trousers",
        "category": "pants",
        "group": "Bottomwear",
        "color": "beige",
        "fit": "relaxed",
        "price": 2299,
        "original_price": 2999,
        "discount_percent": 23,
        "rating": 4.4,
        "reviews_count": 3810,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/trousers/hm/hm-men-beige-relaxed-fit-trousers/1592812/buy",
        "image": "/shop/products/hm_trousers.png",
        "brand": "H&M",
        "badge": "Trending",
        "reason": "Pleated neutral beige trousers bring instant quiet luxury and high versatility across your shirts."
    },
    {
        "id": "uq-olv-hd-01",
        "name": "Hoodie",
        "category": "hoodie",
        "group": "Outerwear",
        "color": "olive",
        "fit": "regular",
        "price": 1999,
        "original_price": 2490,
        "discount_percent": 20,
        "rating": 4.6,
        "reviews_count": 6420,
        "store": "Ajio",
        "store_url": "https://www.ajio.com/search/?text=Uniqlo+Men+Olive+Green+Pullover+Hoodie",
        "image": "/shop/products/uniqlo_hoodie.png",
        "brand": "Uniqlo",
        "badge": "Comfort Classic",
        "reason": "Earthy olive green fleece pullover that contrasts cleanly against light wash denim or black trousers."
    },
    {
        "id": "fsl-blk-wtc-01",
        "name": "Minimal Watch",
        "category": "watch",
        "group": "Accessories",
        "color": "black",
        "fit": "regular",
        "price": 5995,
        "original_price": 9995,
        "discount_percent": 40,
        "rating": 4.6,
        "reviews_count": 4890,
        "store": "Flipkart",
        "store_url": "https://www.flipkart.com/search?q=Fossil+Men+Minimalist+Black+Dial+Watch",
        "image": "/shop/products/fossil_watch.png",
        "brand": "Fossil",
        "badge": "Key Accent",
        "reason": "Monochrome matte black dial and slim profile adds subtle elegance to rolled-up sleeves."
    },

    # ==================== MORE ESSENTIAL TOPS ====================
    {
        "id": "myn-wht-sh-01",
        "name": "Pure Linen Solid Casual Shirt",
        "category": "shirt",
        "group": "Topwear",
        "color": "white",
        "fit": "regular",
        "price": 899,
        "original_price": 1799,
        "discount_percent": 50,
        "rating": 4.3,
        "reviews_count": 4210,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/shirts/roadster/roadster-men-white-pure-cotton-casual-shirt/1374523/buy",
        "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        "brand": "Roadster",
        "badge": "Bestseller",
        "reason": "Crisp white linen shirt anchors almost any bottom layer with timeless elegance."
    },
    {
        "id": "flp-wht-sh-02",
        "name": "Slim Fit White Casual Shirt",
        "category": "shirt",
        "group": "Topwear",
        "color": "white",
        "fit": "slim",
        "price": 649,
        "original_price": 1849,
        "discount_percent": 65,
        "rating": 4.1,
        "reviews_count": 8920,
        "store": "Flipkart",
        "store_url": "https://www.flipkart.com/search?q=Dennis+Lingo+Men+Slim+Fit+White+Casual+Shirt",
        "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
        "brand": "Dennis Lingo",
        "badge": "Top Value",
        "reason": "Tailored slim fit in breathable cotton, perfect for casual dates or office Fridays."
    },
    {
        "id": "myn-olv-sh-01",
        "name": "Olive Green Washed Overshirt",
        "category": "shirt",
        "group": "Topwear",
        "color": "olive",
        "fit": "relaxed",
        "price": 849,
        "original_price": 1699,
        "discount_percent": 50,
        "rating": 4.4,
        "reviews_count": 3540,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/shirts/highlander/men-olive-green-solid-casual-shirt/1429812/buy",
        "image": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80",
        "brand": "Highlander",
        "badge": "Stylist Pick",
        "reason": "Earthy olive green pairs seamlessly with black trousers, blue denim, and white sneakers."
    },
    {
        "id": "myn-beg-sh-01",
        "name": "Beige Pure Cotton Casual Shirt",
        "category": "shirt",
        "group": "Topwear",
        "color": "beige",
        "fit": "relaxed",
        "price": 949,
        "original_price": 1899,
        "discount_percent": 50,
        "rating": 4.3,
        "reviews_count": 2780,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/shirts/mast--harbour/men-beige-solid-casual-shirt/1392812/buy",
        "image": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80",
        "brand": "Mast & Harbour",
        "badge": "Essential",
        "reason": "Neutral beige coordinates with navy, black, and olive for refined quiet luxury."
    },

    # ==================== MORE BOTTOMS ====================
    {
        "id": "myn-blk-pnt-01",
        "name": "Tailored Black Flat-Front Chinos",
        "category": "pants",
        "group": "Bottomwear",
        "color": "black",
        "fit": "slim",
        "price": 1499,
        "original_price": 2499,
        "discount_percent": 40,
        "rating": 4.5,
        "reviews_count": 3980,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/trousers/marks--spencer/men-black-slim-fit-flat-front-chinos/1482910/buy",
        "image": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80",
        "brand": "Marks & Spencer",
        "badge": "Premium Quality",
        "reason": "Clean flat-front trousers that effortlessly bridge casual sneakers and formal shoes."
    },
    {
        "id": "myn-beg-pnt-01",
        "name": "Beige Regular Fit Casual Chinos",
        "category": "pants",
        "group": "Bottomwear",
        "color": "beige",
        "fit": "regular",
        "price": 1399,
        "original_price": 2599,
        "discount_percent": 46,
        "rating": 4.4,
        "reviews_count": 4710,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/trousers/us-polo-assn/men-beige-regular-fit-chinos/1592031/buy",
        "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80",
        "brand": "U.S. Polo Assn.",
        "badge": "Top Rated",
        "reason": "Warm beige chinos anchor white, black, navy, and olive shirts for instant European style."
    },

    # ==================== MORE FOOTWEAR ====================
    {
        "id": "myn-wht-snk-01",
        "name": "Smash V2 Minimalist White Sneakers",
        "category": "sneakers",
        "group": "Footwear",
        "color": "white",
        "fit": "regular",
        "price": 1899,
        "original_price": 3999,
        "discount_percent": 52,
        "rating": 4.5,
        "reviews_count": 14300,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/casual-shoes/puma/puma-men-white-smash-v2-leather-sneakers/1294821/buy",
        "image": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
        "brand": "Puma",
        "badge": "Wardrobe Gold",
        "reason": "Clean low-profile white sneakers are the ultimate multiplier, matching 95% of outfits."
    },
    {
        "id": "flp-wht-snk-02",
        "name": "Classic White Court Sneakers",
        "category": "sneakers",
        "group": "Footwear",
        "color": "white",
        "fit": "regular",
        "price": 1299,
        "original_price": 5499,
        "discount_percent": 76,
        "rating": 4.3,
        "reviews_count": 28940,
        "store": "Flipkart",
        "store_url": "https://www.flipkart.com/search?q=Red+Tape+Men+White+Sneakers",
        "image": "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&auto=format&fit=crop&q=80",
        "brand": "Red Tape",
        "badge": "Super Hit",
        "reason": "Cushioned memory foam insole paired with modern monochrome court profile."
    },
    {
        "id": "myn-blk-sho-01",
        "name": "Black Leather Derby Dress Shoes",
        "category": "shoes",
        "group": "Footwear",
        "color": "black",
        "fit": "regular",
        "price": 2499,
        "original_price": 4999,
        "discount_percent": 50,
        "rating": 4.6,
        "reviews_count": 3120,
        "store": "Myntra",
        "store_url": "https://www.myntra.com/formal-shoes/hush-puppies/men-black-genuine-leather-derby-shoes/1301928/buy",
        "image": "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=80",
        "brand": "Hush Puppies",
        "badge": "Luxury Essential",
        "reason": "Matte black leather elevates chinos and trousers for dates, meetings, and parties."
    },
    {
        "id": "flp-blk-sho-02",
        "name": "Formal Matte Black Derby Shoes",
        "category": "shoes",
        "group": "Footwear",
        "color": "black",
        "fit": "regular",
        "price": 1199,
        "original_price": 1999,
        "discount_percent": 40,
        "rating": 4.3,
        "reviews_count": 18230,
        "store": "Flipkart",
        "store_url": "https://www.flipkart.com/search?q=Bata+Men+Black+Formal+Shoes",
        "image": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80",
        "brand": "Bata",
        "badge": "Trusted Classic",
        "reason": "Durable TPR sole with cushioned collar for all-day formal comfort."
    }
]


def _normalize_cat(c: str) -> str:
    c = (c or "").lower().strip()
    if c in ["tshirt", "t-shirt", "shirt", "top", "polo", "topwear"]:
        return "shirt"
    if c in ["jeans", "denim"]:
        return "jeans"
    if c in ["pants", "trousers", "chinos", "bottom", "joggers", "cargo", "bottomwear"]:
        return "pants"
    if c in ["sneakers", "trainers"]:
        return "sneakers"
    if c in ["shoes", "boots", "loafers", "footwear"]:
        return "shoes"
    if c in ["jacket", "hoodie", "outerwear", "coat"]:
        return "jacket"
    if c in ["watch", "accessories", "belt"]:
        return "watch"
    return c


def _normalize_col(c: str) -> str:
    c = (c or "").lower().strip()
    if c in ["navy", "indigo", "light blue", "dark blue"]:
        return "blue"
    if c in ["khaki", "cream", "tan", "sand"]:
        return "beige"
    if c in ["grey", "charcoal", "slate"]:
        return "grey"
    if c in ["olive", "dark green", "sage"]:
        return "olive"
    return c


def generate_live_store_link(product_name: str, store_name: str) -> str:
    """Builds a real live search link to the store if direct link is not present."""
    builder = STORE_URL_BUILDERS.get(store_name, STORE_URL_BUILDERS["Myntra"])
    return builder(product_name)


def get_all_catalog_products(
    store_filter: Optional[str] = None,
    group_filter: Optional[str] = None,
    color_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    max_price: Optional[int] = None,
    search_query: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns all catalog items with full filtering support."""
    results = []

    for item in CURATED_STORE_PRODUCTS:
        # Store filter
        if store_filter and store_filter.lower() != "all":
            if item.get("store", "").lower() != store_filter.lower():
                continue

        # Group filter (Topwear, Bottomwear, Footwear, Outerwear, Accessories)
        if group_filter and group_filter.lower() != "all":
            if item.get("group", "").lower() != group_filter.lower():
                continue

        # Color filter
        if color_filter and color_filter.lower() != "all":
            target_col = _normalize_col(color_filter)
            item_col = _normalize_col(item.get("color", ""))
            if item_col != target_col:
                continue

        # Brand filter
        if brand_filter and brand_filter.lower() != "all":
            if item.get("brand", "").lower() != brand_filter.lower():
                continue

        # Price filter
        if max_price and item.get("price", 0) > max_price:
            continue

        # Search query
        if search_query:
            sq = search_query.lower().strip()
            text = f"{item.get('name', '')} {item.get('brand', '')} {item.get('category', '')} {item.get('color', '')} {item.get('group', '')}".lower()
            if sq not in text:
                continue

        # Ensure store_url exists
        if not item.get("store_url"):
            item["store_url"] = generate_live_store_link(item["name"], item.get("store", "Myntra"))

        results.append(item)

    return results


def search_store_products(
    category: str,
    color: str,
    store_filter: Optional[str] = None,
    max_price: Optional[int] = None,
    limit: int = 4
) -> List[Dict[str, Any]]:
    """
    Finds best matching fashion pieces based on the missing wardrobe piece's category and color.
    """
    target_cat = _normalize_cat(category)
    target_col = _normalize_col(color)

    exact_matches = []
    category_matches = []
    color_matches = []

    for item in CURATED_STORE_PRODUCTS:
        item_cat = _normalize_cat(item.get("category", ""))
        item_col = _normalize_col(item.get("color", ""))

        if store_filter and store_filter.lower() != "all":
            if item.get("store", "").lower() != store_filter.lower():
                continue

        if max_price and item.get("price", 0) > max_price:
            continue

        if item_cat == target_cat and item_col == target_col:
            exact_matches.append(item)
        elif item_cat == target_cat:
            category_matches.append(item)
        elif item_col == target_col:
            color_matches.append(item)

    # Combine with priority: Exact > Category > Color > General pool
    results = exact_matches.copy()
    if len(results) < limit:
        for p in category_matches:
            if p not in results:
                results.append(p)
                if len(results) >= limit:
                    break

    if len(results) < limit:
        for p in color_matches:
            if p not in results:
                results.append(p)
                if len(results) >= limit:
                    break

    if len(results) < limit:
        for p in CURATED_STORE_PRODUCTS:
            if store_filter and store_filter.lower() != "all":
                if p.get("store", "").lower() != store_filter.lower():
                    continue
            if p not in results:
                results.append(p)
                if len(results) >= limit:
                    break

    for r in results:
        if not r.get("store_url"):
            r["store_url"] = generate_live_store_link(r["name"], r.get("store", "Myntra"))

    return results[:limit]
