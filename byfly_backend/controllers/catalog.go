package controllers

import (
	"encoding/json"
	"fmt"
	"github.com/go-chi/chi/v5"
	"net/http"
	"strconv"
	"strings"
)

func (s *Controller) Categories(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT id,category_no,category_name,created_at FROM categories ORDER BY category_name`)
	if err != nil {
		Error(w, 500, "could not load categories")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var number int64
		var created any
		if rows.Scan(&id, &number, &name, &created) == nil {
			out = append(out, map[string]any{"id": id, "category_no": number, "category_name": name, "created_at": created})
		}
	}
	JSON(w, 200, out)
}
func (s *Controller) Products(w http.ResponseWriter, r *http.Request) {
	q := productSelect + ` WHERE COALESCE(p.is_active,true)=true`
	args := []any{}
	if cat := r.URL.Query().Get("category_id"); cat != "" {
		q += ` AND p.category_id=$1`
		args = append(args, cat)
	}
	q += ` ORDER BY p.created_at DESC`
	paginated := r.URL.Query().Get("paginated") == "true"
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if paginated {
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 50 {
			limit = 50
		}
		offset := (page - 1) * limit
		limitPlaceholder := len(args) + 1
		offsetPlaceholder := len(args) + 2
		q += fmt.Sprintf(" LIMIT $%d OFFSET $%d", limitPlaceholder, offsetPlaceholder)
		args = append(args, limit+1, offset)
	}
	rows, err := s.DB.Query(r.Context(), q, args...)
	if err != nil {
		Error(w, 500, "could not load products")
		return
	}
	defer rows.Close()
	products := scanProducts(rows)
	for _, product := range products {
		product["max_product_images"] = s.MaxProductImages
	}
	if paginated {
		hasMore := len(products) > limit
		if hasMore {
			products = products[:limit]
		}
		JSON(w, 200, map[string]any{"items": products, "page": page, "limit": limit, "has_more": hasMore})
		return
	}
	JSON(w, 200, products)
}

func (s *Controller) SearchProducts(w http.ResponseWriter, r *http.Request) {
	term := strings.TrimSpace(r.URL.Query().Get("q"))
	if term == "" {
		JSON(w, 200, map[string]any{"items": []any{}, "page": 1, "limit": 20, "has_more": false})
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := s.DB.Query(r.Context(), productSelect+`
WHERE COALESCE(p.is_active,true)=true
  AND (p.product_name ILIKE $1 OR p.product_code ILIKE $1 OR c.category_name ILIKE $1)
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3`, "%"+term+"%", limit+1, offset)
	if err != nil {
		Error(w, 500, "could not search products")
		return
	}
	defer rows.Close()

	products := scanProducts(rows)
	hasMore := len(products) > limit
	if hasMore {
		products = products[:limit]
	}
	for _, product := range products {
		product["max_product_images"] = s.MaxProductImages
	}
	JSON(w, 200, map[string]any{
		"items":    products,
		"page":     page,
		"limit":    limit,
		"has_more": hasMore,
	})
}
func (s *Controller) Product(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), productSelect+` WHERE (p.id=$1 OR p.product_no::text=$1) AND COALESCE(p.is_active,true)=true`, chi.URLParam(r, "id"))
	if err != nil {
		Error(w, 404, "product not found")
		return
	}
	defer rows.Close()
	p := scanProducts(rows)
	if len(p) == 0 {
		Error(w, 404, "product not found")
		return
	}
	p[0]["max_product_images"] = s.MaxProductImages
	JSON(w, 200, p[0])
}

const productSelect = `SELECT p.id,p.product_no,p.product_name,p.product_code,p.description,
COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.image_index LIMIT 1),'') AS image_url,
p.category_id,c.category_name,pp.retail_price,pp.wholesale_price,pp.retail_mrp,pp.wholesale_mrp,pp.wholesale_min_order_qty,
COALESCE(ps.retail_quantity,0),COALESCE(ps.wholesale_quantity,0),
COALESCE((SELECT json_agg(json_build_object('id',pi.id,'url',pi.image_url,'image_index',pi.image_index) ORDER BY pi.image_index) FROM product_images pi WHERE pi.product_id=p.id),'[]'::json) AS images
FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_prices pp ON pp.product_id=p.id LEFT JOIN product_stock ps ON ps.product_id=p.id`

func scanProducts(rows interface {
	Next() bool
	Scan(...any) error
}) []map[string]any {
	out := []map[string]any{}
	for rows.Next() {
		var id, name, code string
		var number int64
		var desc, img, cat, catName any
		var rp, wp, rm, wm any
		var imagesJSON []byte
		var min, rs, ws int
		if rows.Scan(&id, &number, &name, &code, &desc, &img, &cat, &catName, &rp, &wp, &rm, &wm, &min, &rs, &ws, &imagesJSON) != nil {
			continue
		}
		var images []map[string]any
		_ = json.Unmarshal(imagesJSON, &images)
		out = append(out, map[string]any{"id": id, "product_no": number, "product_name": name, "product_code": code, "description": desc, "image_url": img, "images": images, "category_id": cat, "categories": map[string]any{"category_name": catName}, "retail_price": rp, "wholesale_price": wp, "retail_mrp": rm, "wholesale_mrp": wm, "wholesale_min_order_qty": min, "product_stock": map[string]int{"retail_quantity": rs, "wholesale_quantity": ws}, "stock": ws})
	}
	return out
}
