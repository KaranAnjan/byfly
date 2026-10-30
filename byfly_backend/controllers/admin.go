package controllers

import (
	"errors"
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"net/http"
	"net/url"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type categoryInput struct {
	CategoryName string `json:"category_name"`
}

func (s *Controller) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var in categoryInput
	if decode(r, &in) != nil || strings.TrimSpace(in.CategoryName) == "" {
		Error(w, 400, "category_name is required")
		return
	}
	var id, name string
	var number int64
	err := s.DB.QueryRow(r.Context(), `INSERT INTO categories(category_name) VALUES($1) RETURNING id,category_no,category_name`, strings.TrimSpace(in.CategoryName)).Scan(&id, &number, &name)
	if err != nil {
		Error(w, 400, "category already exists or could not be created")
		return
	}
	JSON(w, 201, map[string]any{"id": id, "category_no": number, "category_name": name})
}
func (s *Controller) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	if _, err := s.DB.Exec(r.Context(), `DELETE FROM categories WHERE id=$1`, chi.URLParam(r, "id")); err != nil {
		Error(w, 400, "could not delete category")
		return
	}
	w.WriteHeader(204)
}

type productInput struct {
	ProductName          string  `json:"product_name"`
	ProductCode          string  `json:"product_code"`
	Description          *string `json:"description"`
	ImageURL             string  `json:"image_url"`
	CategoryID           string  `json:"category_id"`
	ExpiryDate           *string `json:"expiry_date"`
	Cost                 float64 `json:"cost"`
	RetailPrice          float64 `json:"retail_price"`
	RetailMRP            float64 `json:"retail_mrp"`
	WholesalePrice       float64 `json:"wholesale_price"`
	WholesaleMRP         float64 `json:"wholesale_mrp"`
	WholesaleMinOrderQty int     `json:"wholesale_min_order_qty"`
	RetailStock          int     `json:"retail_stock"`
	WholesaleStock       int     `json:"wholesale_stock"`
}

func (s *Controller) SaveProduct(w http.ResponseWriter, r *http.Request) {
	var in productInput
	if decode(r, &in) != nil || in.ProductName == "" || in.ProductCode == "" || in.CategoryID == "" {
		Error(w, 400, "product_name, product_code and category_id are required")
		return
	}
	if in.WholesaleMinOrderQty < 1 {
		in.WholesaleMinOrderQty = 1
	}
	if in.ExpiryDate != nil && strings.TrimSpace(*in.ExpiryDate) == "" {
		in.ExpiryDate = nil
	}
	if in.ExpiryDate != nil {
		if _, err := time.Parse("2006-01-02", strings.TrimSpace(*in.ExpiryDate)); err != nil {
			Error(w, 400, "expiry_date must be a valid date")
			return
		}
		value := strings.TrimSpace(*in.ExpiryDate)
		in.ExpiryDate = &value
	}
	tx, err := s.DB.Begin(r.Context())
	if err != nil {
		Error(w, 500, "could not start product save")
		return
	}
	defer tx.Rollback(r.Context())
	var id string
	if pid := chi.URLParam(r, "id"); pid != "" {
		err = tx.QueryRow(r.Context(), `UPDATE products SET product_name=$1,product_code=$2,description=$3,image_url=$4,category_id=$5,expiry_date=$6,updated_at=now() WHERE (id=$7 OR product_no::text=$7) RETURNING id`, in.ProductName, in.ProductCode, in.Description, in.ImageURL, in.CategoryID, in.ExpiryDate, pid).Scan(&id)
	} else {
		err = tx.QueryRow(r.Context(), `INSERT INTO products(product_name,product_code,description,image_url,category_id,expiry_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, in.ProductName, in.ProductCode, in.Description, in.ImageURL, in.CategoryID, in.ExpiryDate).Scan(&id)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			Error(w, http.StatusConflict, "A product with this product code already exists")
			return
		}
		Error(w, 400, "could not save product")
		return
	}
	_, err = tx.Exec(r.Context(), `INSERT INTO product_prices(product_id,cost,retail_price,retail_mrp,wholesale_price,wholesale_mrp,wholesale_min_order_qty) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(product_id) DO UPDATE SET cost=EXCLUDED.cost,retail_price=EXCLUDED.retail_price,retail_mrp=EXCLUDED.retail_mrp,wholesale_price=EXCLUDED.wholesale_price,wholesale_mrp=EXCLUDED.wholesale_mrp,wholesale_min_order_qty=EXCLUDED.wholesale_min_order_qty`, id, in.Cost, in.RetailPrice, in.RetailMRP, in.WholesalePrice, in.WholesaleMRP, in.WholesaleMinOrderQty)
	if err != nil {
		Error(w, 400, "could not save product prices")
		return
	}
	_, err = tx.Exec(r.Context(), `INSERT INTO product_stock(product_id,retail_quantity,wholesale_quantity) VALUES($1,$2,$3) ON CONFLICT(product_id) DO UPDATE SET retail_quantity=EXCLUDED.retail_quantity,wholesale_quantity=EXCLUDED.wholesale_quantity,updated_at=now()`, id, in.RetailStock, in.WholesaleStock)
	if err != nil {
		Error(w, 400, "could not save product stock")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		Error(w, 500, "could not finalize product")
		return
	}
	var number int64
	if err = s.DB.QueryRow(r.Context(), `SELECT product_no FROM products WHERE id=$1`, id).Scan(&number); err != nil {
		Error(w, 500, "could not load saved product number")
		return
	}
	JSON(w, 200, map[string]any{"id": id, "product_no": number})
}

func imageKeyFromURL(value string) string {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err == nil && parsed.Host != "" {
		return strings.TrimPrefix(parsed.Path, "/")
	}
	return strings.TrimPrefix(strings.TrimSpace(value), "/")
}

func (s *Controller) UploadProductImage(w http.ResponseWriter, r *http.Request) {
	if s.S3 == nil {
		Error(w, http.StatusServiceUnavailable, "S3 is not configured")
		return
	}
	productID := chi.URLParam(r, "id")
	var category, code string
	if err := s.DB.QueryRow(r.Context(), `SELECT COALESCE(c.category_name,'uncategorized'),p.product_code FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=$1 OR p.product_no::text=$1`, productID).Scan(&category, &code); err != nil {
		Error(w, http.StatusNotFound, "product not found")
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Error(w, http.StatusBadRequest, "invalid image upload")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()
	const maxImageSize = 1 << 20
	if header.Size >= maxImageSize {
		Error(w, http.StatusRequestEntityTooLarge, "image must be smaller than 1 MB")
		return
	}
	imageIndex := 0
	maxImages := s.MaxProductImages
	if maxImages < 1 {
		maxImages = 4
	}
	if value := strings.TrimSpace(r.FormValue("image_index")); value != "" {
		imageIndex, err = strconv.Atoi(value)
		if err != nil || imageIndex < 1 || imageIndex > maxImages {
			Error(w, http.StatusBadRequest, fmt.Sprintf("image_index must be between 1 and %d", maxImages))
			return
		}
	}
	if imageIndex == 0 {
		if err = s.DB.QueryRow(r.Context(), `SELECT COALESCE(MAX(image_index),0)+1 FROM product_images WHERE product_id=$1`, productID).Scan(&imageIndex); err != nil || imageIndex > maxImages {
			Error(w, http.StatusConflict, fmt.Sprintf("a product can have at most %d images", maxImages))
			return
		}
	}
	key := fmt.Sprintf("categories/%s/products/%s/%d-%s", slugify(category), slugify(code), time.Now().UnixNano(), filepath.Base(header.Filename))
	imageURL, err := s.S3.Upload(r.Context(), key, header.Header.Get("Content-Type"), file)
	if err != nil {
		Error(w, http.StatusInternalServerError, "could not upload image to S3")
		return
	}
	var imageID string
	err = s.DB.QueryRow(r.Context(), `INSERT INTO product_images(product_id,image_url,image_key,image_index) VALUES($1,$2,$3,$4) ON CONFLICT(product_id,image_index) DO UPDATE SET image_url=EXCLUDED.image_url,image_key=EXCLUDED.image_key RETURNING id`, productID, imageURL, key, imageIndex).Scan(&imageID)
	if err != nil {
		Error(w, http.StatusBadRequest, "could not save product image")
		return
	}
	JSON(w, http.StatusCreated, map[string]any{"id": imageID, "url": imageURL, "key": key, "image_index": imageIndex})
}

func (s *Controller) DeleteProductImage(w http.ResponseWriter, r *http.Request) {
	if _, err := s.DB.Exec(r.Context(), `DELETE FROM product_images WHERE product_id=$1 AND id=$2`, chi.URLParam(r, "id"), chi.URLParam(r, "imageID")); err != nil {
		Error(w, http.StatusBadRequest, "could not delete product image")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Controller) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	if _, err := s.DB.Exec(r.Context(), `DELETE FROM products WHERE (id=$1 OR product_no::text=$1)`, chi.URLParam(r, "id")); err != nil {
		Error(w, 400, "could not delete product")
		return
	}
	w.WriteHeader(204)
}

func slugify(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	v = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(v, "-")
	return strings.Trim(v, "-")
}
func (s *Controller) UploadImage(w http.ResponseWriter, r *http.Request) {
	if s.S3 == nil {
		Error(w, 503, "S3 is not configured")
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Error(w, 400, "invalid image upload")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, 400, "file is required")
		return
	}
	defer file.Close()
	const maxImageSize = 1 << 20
	if header.Size >= maxImageSize {
		Error(w, http.StatusRequestEntityTooLarge, "image must be smaller than 1 MB")
		return
	}
	category := slugify(r.FormValue("category"))
	if category == "" {
		category = "uncategorized"
	}
	code := slugify(r.FormValue("product_code"))
	if code == "" {
		code = "product"
	}
	key := fmt.Sprintf("categories/%s/products/%s/%d-%s", category, code, time.Now().UnixNano(), filepath.Base(header.Filename))
	url, err := s.S3.Upload(r.Context(), key, header.Header.Get("Content-Type"), file)
	if err != nil {
		Error(w, 500, "could not upload image to S3")
		return
	}
	JSON(w, 201, map[string]string{"key": key, "url": url})
}
