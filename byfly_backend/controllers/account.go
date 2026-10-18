package controllers

import (
	"github.com/byfly/byfly-backend/auth"
	"github.com/go-chi/chi/v5"
	"net/http"
)

func userID(r *http.Request) string { id, _ := auth.FromContext(r.Context()); return id.ID }
func (s *Controller) Me(w http.ResponseWriter, r *http.Request) {
	var id, email, name, role, phone, address, address2, city, state, pincode, contactEmail string
	var admin bool
	err := s.DB.QueryRow(r.Context(), `INSERT INTO users (id,email) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET email=COALESCE(NULLIF(EXCLUDED.email,''),users.email),updated_at=now() RETURNING id,email,COALESCE(name,''),COALESCE(phone,''),COALESCE(role,'customer'),is_admin`, userID(r), func() string {
		_, e := auth.FromContext(r.Context())
		if e {
			x, _ := auth.FromContext(r.Context())
			return x.Email
		}
		return ""
	}()).Scan(&id, &email, &name, &phone, &role, &admin)
	if err != nil {
		Error(w, 500, "could not load account")
		return
	}
	var wholesaleEnabled bool
	var businessName, accountPhone, accountAddress1, accountAddress2, accountCity, accountState, accountPincode string
	_ = s.DB.QueryRow(r.Context(), `SELECT is_active,COALESCE(business_name,''),COALESCE(contact_email,''),COALESCE(phone,''),COALESCE(address1,''),COALESCE(address2,''),COALESCE(city,''),COALESCE(state,''),COALESCE(pincode,'') FROM wholesale_accounts WHERE user_id=$1`, id).Scan(&wholesaleEnabled, &businessName, &contactEmail, &accountPhone, &accountAddress1, &accountAddress2, &accountCity, &accountState, &accountPincode)
	if accountPhone != "" {
		phone = accountPhone
	}
	if accountAddress1 != "" {
		address = accountAddress1
	}
	if accountAddress2 != "" {
		address2 = accountAddress2
	}
	if accountCity != "" {
		city = accountCity
	}
	if accountState != "" {
		state = accountState
	}
	if accountPincode != "" {
		pincode = accountPincode
	}
	if contactEmail == "" {
		contactEmail = email
	}
	if contactEmail != "" {
		_, _ = s.DB.Exec(r.Context(), `INSERT INTO wholesale_accounts(user_id,contact_email) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET contact_email=CASE WHEN COALESCE(wholesale_accounts.contact_email,'')='' THEN EXCLUDED.contact_email ELSE wholesale_accounts.contact_email END,updated_at=now()`, id, contactEmail)
	}
	JSON(w, 200, map[string]any{
		"id": id, "email": email, "contact_email": contactEmail, "name": name, "role": role, "is_admin": admin,
		"is_wholesaler": wholesaleEnabled, "wholesale_enabled": wholesaleEnabled,
		"business_name": businessName,
		"phone":         phone, "address": address, "address1": address, "address2": address2, "city": city, "state": state, "pincode": pincode,
	})
}

func (s *Controller) UpdateMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name         string `json:"name"`
		Phone        string `json:"phone"`
		Address      string `json:"address"`
		Address1     string `json:"address1"`
		Address2     string `json:"address2"`
		City         string `json:"city"`
		State        string `json:"state"`
		Pincode      string `json:"pincode"`
		ContactEmail string `json:"contact_email"`
	}
	if decode(r, &in) != nil {
		Error(w, 400, "invalid profile")
		return
	}
	address1 := in.Address1
	if address1 == "" {
		address1 = in.Address
	}
	if in.ContactEmail == "" {
		if identity, ok := auth.FromContext(r.Context()); ok {
			in.ContactEmail = identity.Email
		}
	}
	_, err := s.DB.Exec(r.Context(), `UPDATE users SET name=$1,phone=$2,updated_at=now() WHERE id=$3`, in.Name, in.Phone, userID(r))
	if err != nil {
		Error(w, 400, "could not save profile")
		return
	}
	_, err = s.DB.Exec(r.Context(), `INSERT INTO wholesale_accounts(user_id,phone,address1,address2,city,state,pincode,contact_email) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id) DO UPDATE SET phone=EXCLUDED.phone,address1=EXCLUDED.address1,address2=EXCLUDED.address2,city=EXCLUDED.city,state=EXCLUDED.state,pincode=EXCLUDED.pincode,contact_email=EXCLUDED.contact_email,updated_at=now()`, userID(r), in.Phone, address1, in.Address2, in.City, in.State, in.Pincode, in.ContactEmail)
	if err != nil {
		Error(w, 400, "could not save wholesale account details")
		return
	}
	JSON(w, 200, map[string]any{"name": in.Name, "phone": in.Phone, "address": address1, "address1": address1, "address2": in.Address2, "city": in.City, "state": in.State, "pincode": in.Pincode, "contact_email": in.ContactEmail})
}
func (s *Controller) Cart(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT c.product_id,c.quantity,p.product_no,p.product_name,p.product_code,COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.image_index LIMIT 1),''),COALESCE(pp.wholesale_price,pp.retail_price),COALESCE(ps.wholesale_quantity,ps.retail_quantity,0) FROM cart_items c JOIN products p ON p.id=c.product_id LEFT JOIN product_prices pp ON pp.product_id=p.id LEFT JOIN product_stock ps ON ps.product_id=p.id WHERE c.user_id=$1 ORDER BY c.updated_at DESC`, userID(r))
	if err != nil {
		Error(w, 500, "could not load cart")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var pid, name, code string
		var productNo int64
		var img, price any
		var qty, stock int
		if rows.Scan(&pid, &qty, &productNo, &name, &code, &img, &price, &stock) == nil {
			out = append(out, map[string]any{"product_id": pid, "product_no": productNo, "quantity": qty, "product_name": name, "product_code": code, "image_url": img, "price": price, "stock": stock})
		}
	}
	JSON(w, 200, out)
}

type cartInput struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

func (s *Controller) PutCart(w http.ResponseWriter, r *http.Request) {
	var in cartInput
	if decode(r, &in) != nil || in.ProductID == "" || in.Quantity < 1 {
		Error(w, 400, "product_id and positive quantity are required")
		return
	}
	_, err := s.DB.Exec(r.Context(), `INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now()`, userID(r), in.ProductID, in.Quantity)
	if err != nil {
		Error(w, 400, "could not update cart")
		return
	}
	JSON(w, 200, map[string]string{"status": "ok"})
}
func (s *Controller) DeleteCart(w http.ResponseWriter, r *http.Request) {
	_, err := s.DB.Exec(r.Context(), `DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2`, userID(r), chi.URLParam(r, "productID"))
	if err != nil {
		Error(w, 500, "could not remove cart item")
		return
	}
	w.WriteHeader(204)
}
func (s *Controller) Wishlist(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT w.product_id,p.product_no,p.product_name,p.product_code,p.description,COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.image_index LIMIT 1),''),p.category_id,c.category_name,pp.retail_price,pp.wholesale_price,pp.retail_mrp,pp.wholesale_mrp,pp.wholesale_min_order_qty,COALESCE(ps.retail_quantity,0),COALESCE(ps.wholesale_quantity,0) FROM wishlists w JOIN products p ON p.id=w.product_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_prices pp ON pp.product_id=p.id LEFT JOIN product_stock ps ON ps.product_id=p.id WHERE w.user_id=$1 ORDER BY w.created_at DESC`, userID(r))
	if err != nil {
		Error(w, 500, "could not load wishlist")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, code string
		var productNo int64
		var desc, img, cat, catName, retailPrice, wholesalePrice, retailMrp, wholesaleMrp any
		var min, retailStock, wholesaleStock int
		if rows.Scan(&id, &productNo, &name, &code, &desc, &img, &cat, &catName, &retailPrice, &wholesalePrice, &retailMrp, &wholesaleMrp, &min, &retailStock, &wholesaleStock) == nil {
			out = append(out, map[string]any{"id": id, "product_no": productNo, "product_name": name, "product_code": code, "description": desc, "image_url": img, "category_id": cat, "categories": map[string]any{"category_name": catName}, "retail_price": retailPrice, "wholesale_price": wholesalePrice, "retail_mrp": retailMrp, "wholesale_mrp": wholesaleMrp, "wholesale_min_order_qty": min, "product_stock": map[string]int{"retail_quantity": retailStock, "wholesale_quantity": wholesaleStock}, "stock": wholesaleStock})
		}
	}
	JSON(w, 200, out)
}
func (s *Controller) PutWishlist(w http.ResponseWriter, r *http.Request) {
	_, err := s.DB.Exec(r.Context(), `INSERT INTO wishlists(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, userID(r), chi.URLParam(r, "productID"))
	if err != nil {
		Error(w, 400, "could not add wishlist item")
		return
	}
	w.WriteHeader(204)
}
func (s *Controller) DeleteWishlist(w http.ResponseWriter, r *http.Request) {
	_, err := s.DB.Exec(r.Context(), `DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2`, userID(r), chi.URLParam(r, "productID"))
	if err != nil {
		Error(w, 500, "could not remove wishlist item")
		return
	}
	w.WriteHeader(204)
}
