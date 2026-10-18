class Category {
  final String id;
  final String categoryName;
  final String? createdAt;

  Category({
    required this.id,
    required this.categoryName,
    this.createdAt,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'].toString(),
      categoryName: json['category_name'] ?? '',
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category_name': categoryName,
      'created_at': createdAt,
    };
  }
}
