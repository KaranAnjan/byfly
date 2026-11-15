package controllers

import (
	"encoding/json"
	"fmt"
	"github.com/go-chi/chi/v5"
	"log"
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
	totalCount := 0
	if paginated {
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 50 {
			limit = 50
		}
		offset := (page - 1) * limit
		countQuery := `SELECT COUNT(*) FROM products p WHERE COALESCE(p.is_active,true)=true`
		countArgs := []any{}
		if cat := r.URL.Query().Get("category_id"); cat != "" {
			countQuery += ` AND p.category_id=$1`
			countArgs = append(countArgs, cat)
		}
		if err := s.DB.QueryRow(r.Context(), countQuery, countArgs...).Scan(&totalCount); err != nil {
			Error(w, 500, "could not count products")
			return
		}
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
		JSON(w, 200, map[string]any{"items": products, "page": page, "limit": limit, "has_more": hasMore, "total_count": totalCount})
		return
	}
	JSON(w, 200, products)
}

func (s *Controller) SearchProducts(w http.ResponseWriter, r *http.Request) {
	term := strings.TrimSpace(r.URL.Query().Get("q"))
	if term == "" {
		JSON(w, 200, map[string]any{"items": []any{}, "page": 1, "limit": 50, "has_more": false, "total_count": 0})
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
	nameCodeOnly := r.URL.Query().Get("scope") == "name_code"
	// Search the complete phrase as well as each meaningful word. This makes
	// suggestions useful for inputs such as "gold chain" and partial scans,
	// instead of requiring the whole value to match one database field.
	searchArgs := []any{term, "%" + term + "%"}
	searchParts := []string{}
	substringMatch := func(placeholder string) string {
		if nameCodeOnly {
			return `p.product_name ILIKE ` + placeholder + ` OR p.product_code ILIKE ` + placeholder
		}
		return `p.product_name ILIKE ` + placeholder + ` OR p.product_code ILIKE ` + placeholder + ` OR p.product_no::text ILIKE ` + placeholder + ` OR c.category_name ILIKE ` + placeholder
	}
	// Fuzzy matching tolerates typos such as "vasline" for "vaseline". The
	// threshold was chosen so real typos match while unrelated products don't.
	fuzzyMatch := func(placeholder string) string {
		parts := []string{
			`word_similarity(LOWER(` + placeholder + `), LOWER(p.product_name)) >= 0.45`,
			`word_similarity(LOWER(` + placeholder + `), LOWER(p.product_code)) >= 0.45`,
		}
		if !nameCodeOnly {
			parts = append(parts, `word_similarity(LOWER(`+placeholder+`), LOWER(COALESCE(c.category_name,''))) >= 0.45`)
		}
		return strings.Join(parts, " OR ")
	}
	searchParts = append(searchParts, substringMatch("$2"))
	if len([]rune(term)) >= 3 {
		searchParts = append(searchParts, fuzzyMatch("$1"))
	}
	for _, word := range strings.Fields(term) {
		if len([]rune(word)) < 2 {
			continue
		}
		searchArgs = append(searchArgs, "%"+word+"%")
		placeholder := fmt.Sprintf("$%d", len(searchArgs))
		part := substringMatch(placeholder)
		if len([]rune(word)) >= 3 {
			searchArgs = append(searchArgs, word)
			part += ` OR ` + fuzzyMatch(fmt.Sprintf("$%d", len(searchArgs)))
		}
		searchParts = append(searchParts, part)
	}
	searchCondition := "(" + strings.Join(searchParts, ") OR (") + ")"
	// Lower rank is better. Exact values still win, but the rest of the
	// suggestions are ordered by prefix, field relevance, and name length.
	rank := `CASE
		WHEN LOWER(p.product_code)=LOWER($1) OR p.product_no::text=$1 THEN 0
		WHEN LOWER(p.product_code) LIKE LOWER($1)||'%' THEN 1
		WHEN LOWER(p.product_name) LIKE LOWER($1)||'%' THEN 2
		WHEN LOWER(p.product_code) LIKE '%'||LOWER($1)||'%' THEN 3
		WHEN LOWER(p.product_name) LIKE '%'||LOWER($1)||'%' THEN 4
		WHEN LOWER(COALESCE(c.category_name,'')) LIKE '%'||LOWER($1)||'%' THEN 5
		ELSE 6 END`
	// Among equally relevant matches, prefer the closest fuzzy match so typos
	// such as "vasline" surface "vaseline" products first.
	matchScore := `GREATEST(
		word_similarity(LOWER($1), LOWER(p.product_name)),
		word_similarity(LOWER($1), LOWER(p.product_code)),
		word_similarity(LOWER($1), LOWER(COALESCE(c.category_name,'')))
	)`
	var totalCount int
	if err := s.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id
WHERE COALESCE(p.is_active,true)=true AND $1::text IS NOT NULL AND (`+searchCondition+`)`, searchArgs...).Scan(&totalCount); err != nil {
		log.Printf("product search count failed for %q: %v", term, err)
		Error(w, 500, "could not count products")
		return
	}

	searchArgs = append(searchArgs, limit+1, offset)
	limitPlaceholder := len(searchArgs) - 1
	offsetPlaceholder := len(searchArgs)
	rows, err := s.DB.Query(r.Context(), productSelect+`
WHERE COALESCE(p.is_active,true)=true AND (`+searchCondition+`)
ORDER BY `+rank+`, `+matchScore+` DESC, LENGTH(p.product_name), LOWER(p.product_name), p.created_at DESC
LIMIT $`+strconv.Itoa(limitPlaceholder)+` OFFSET $`+strconv.Itoa(offsetPlaceholder), searchArgs...)
	if err != nil {
		log.Printf("product search query failed for %q: %v", term, err)
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
		"items":       products,
		"page":        page,
		"limit":       limit,
		"has_more":    hasMore,
		"total_count": totalCount,
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
	p.category_id,c.category_name,p.expiry_date,pp.cost,pp.retail_price,pp.wholesale_price,pp.retail_mrp,pp.wholesale_mrp,pp.wholesale_min_order_qty,
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
		var desc, img, cat, catName, expiryDate any
		var cost, rp, wp, rm, wm any
		var imagesJSON []byte
		var min, rs, ws int
		if rows.Scan(&id, &number, &name, &code, &desc, &img, &cat, &catName, &expiryDate, &cost, &rp, &wp, &rm, &wm, &min, &rs, &ws, &imagesJSON) != nil {
			continue
		}
		var images []map[string]any
		_ = json.Unmarshal(imagesJSON, &images)
		out = append(out, map[string]any{"id": id, "product_no": number, "product_name": name, "product_code": code, "description": desc, "image_url": img, "images": images, "category_id": cat, "categories": map[string]any{"category_name": catName}, "expiry_date": expiryDate, "cost": cost, "retail_price": rp, "wholesale_price": wp, "retail_mrp": rm, "wholesale_mrp": wm, "wholesale_min_order_qty": min, "product_stock": map[string]int{"retail_quantity": rs, "wholesale_quantity": ws}, "stock": ws})
	}
	return out
}
