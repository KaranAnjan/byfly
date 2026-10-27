class Product {
  final String id;
  final String productName;
  final String productCode;
  final double price;
  final double? mrp;
  final double? retailPrice;
  final double? wholesalePrice;
  final double? retailMrp;
  final double? wholesaleMrp;
  final int minOrderQty;
  final int stock;
  final int retailStock;
  final int wholesaleStock;
  final String? imageUrl;
  final List<String> imageUrls;
  final String? categoryId;
  final String? categoryName;
  final String? _description;

  String? get description => _description;

  Product({
    required this.id,
    required this.productName,
    required this.productCode,
    required this.price,
    this.mrp,
    this.retailPrice,
    this.wholesalePrice,
    this.retailMrp,
    this.wholesaleMrp,
    this.minOrderQty = 1,
    required this.stock,
    this.retailStock = 0,
    this.wholesaleStock = 0,
    this.imageUrl,
    this.imageUrls = const [],
    this.categoryId,
    this.categoryName,
    String? description,
  }) : _description = description;

  factory Product.fromJson(Map<String, dynamic> json) {
    // Parse nested prices table if present
    final priceCatalog =
        json['product_prices'] ?? json['product_price_catalog'];
    Map<String, dynamic>? priceMap;
    if (priceCatalog is List && priceCatalog.isNotEmpty) {
      priceMap = priceCatalog.first as Map<String, dynamic>?;
    } else if (priceCatalog is Map<String, dynamic>) {
      priceMap = priceCatalog;
    }

    final retailP = (priceMap?['retail_price'] ??
            json['price'] ??
            json['retail_price'] as num?)
        ?.toDouble();
    final wholesaleP =
        (priceMap?['wholesale_price'] ?? json['wholesale_price'] as num?)
            ?.toDouble();
    final retailM =
        (priceMap?['retail_mrp'] ?? json['mrp'] ?? json['retail_mrp'] as num?)
            ?.toDouble();
    final wholesaleM =
        (priceMap?['wholesale_mrp'] ?? json['wholesale_mrp'] as num?)
            ?.toDouble();

    // Parse stock record if present
    final stockRecord = json['product_stock'];
    int rStock = 0;
    int wStock = 0;
    if (stockRecord is List && stockRecord.isNotEmpty) {
      rStock = (stockRecord.first['retail_quantity'] as num?)?.toInt() ?? 0;
      wStock = (stockRecord.first['wholesale_quantity'] as num?)?.toInt() ?? 0;
    } else if (stockRecord is Map<String, dynamic>) {
      rStock = (stockRecord['retail_quantity'] as num?)?.toInt() ?? 0;
      wStock = (stockRecord['wholesale_quantity'] as num?)?.toInt() ?? 0;
    } else {
      wStock = (json['stock'] as num?)?.toInt() ?? 0;
    }

    // This is a wholesale-only app. Do not fall back to retail values: the
    // web store shows price-on-request when wholesale pricing is not set.
    final calculatedPrice = wholesaleP ?? 0.0;
    final calculatedMrp = wholesaleM;
    final calculatedStock = wStock;

    final wholesaleMinQty = ((json['wholesale_min_order_qty'] ??
                priceMap?['wholesale_min_order_qty']) as num?)
            ?.toInt() ??
        1;

    final parsedImages = <String>[];
    final rawImages = json['images'];
    if (rawImages is List) {
      for (final item in rawImages) {
        if (item is Map &&
            item['url'] != null &&
            item['url'].toString().isNotEmpty) {
          parsedImages.add(item['url'].toString());
        }
      }
    }
    final rawPrimaryImage = parsedImages.isNotEmpty
        ? parsedImages.first
        : json['image_url']?.toString();
    final primaryImage = rawPrimaryImage == null || rawPrimaryImage.isEmpty
        ? null
        : rawPrimaryImage;
    if (primaryImage != null &&
        primaryImage.isNotEmpty &&
        !parsedImages.contains(primaryImage)) {
      parsedImages.insert(0, primaryImage);
    }

    return Product(
      id: json['id'].toString(),
      productName: json['product_name'] ?? '',
      productCode: json['product_code'] ?? '',
      price: calculatedPrice,
      mrp: calculatedMrp,
      retailPrice: retailP,
      wholesalePrice: wholesaleP,
      retailMrp: retailM,
      wholesaleMrp: wholesaleM,
      minOrderQty: wholesaleMinQty < 1 ? 1 : wholesaleMinQty,
      stock: calculatedStock,
      retailStock: rStock,
      wholesaleStock: wStock,
      imageUrl: primaryImage,
      imageUrls: parsedImages,
      categoryId: json['category_id']?.toString(),
      categoryName: json['categories'] != null
          ? json['categories']['category_name']
          : null,
      description: json['description']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_name': productName,
      'product_code': productCode,
      'price': price,
      'mrp': mrp,
      'stock': stock,
      'image_url': imageUrl,
      'category_id': categoryId,
      'description': description,
    };
  }
}

class CartItem {
  final Product product;
  int quantity;

  CartItem({
    required this.product,
    this.quantity = 1,
  });
}
