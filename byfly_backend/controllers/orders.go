package controllers

import (
	"github.com/byfly/byfly-backend/auth"
	"net/http"
)

type orderInput struct {
	CustomerName     string `json:"customer_name"`
	CustomerPhone    string `json:"customer_phone"`
	CustomerEmail    string `json:"customer_email"`
	CustomerAddress  string `json:"customer_address"`
	CustomerAddress1 string `json:"customer_address1"`
	CustomerAddress2 string `json:"customer_address2"`
	CustomerCity     string `json:"customer_city"`
	CustomerState    string `json:"customer_state"`
	CustomerPincode  string `json:"customer_pincode"`
	Items            []struct {
		ProductID string `json:"product_id"`
		Quantity  int    `json:"quantity"`
	} `json:"items"`
}

func (s *Controller) Orders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT id,order_no,order_number,total_amount,status,delivery_status,customer_name,customer_address,customer_pincode,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC`, userID(r))
	if err != nil {
		Error(w, 500, "could not load orders")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, num, status, delivery, name, address, pin string
		var orderNo int64
		var total, created any
		if rows.Scan(&id, &orderNo, &num, &total, &status, &delivery, &name, &address, &pin, &created) == nil {
			items, itemErr := s.orderItems(r, id)
			if itemErr != nil {
				Error(w, 500, "could not load order items")
				return
			}
			for _, item := range items {
				item["order_no"] = orderNo
			}
			out = append(out, map[string]any{"id": id, "order_no": orderNo, "order_number": num, "total_amount": total, "status": status, "delivery_status": delivery, "customer_name": name, "customer_address": address, "customer_pincode": pin, "created_at": created, "order_items": items})
		}
	}
	JSON(w, 200, out)
}
func (s *Controller) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var in orderInput
	if decode(r, &in) != nil || len(in.Items) == 0 || in.CustomerName == "" || in.CustomerAddress == "" {
		Error(w, 400, "customer details and items are required")
		return
	}
	tx, err := s.DB.Begin(r.Context())
	if err != nil {
		Error(w, 500, "could not start order")
		return
	}
	defer tx.Rollback(r.Context())
	var orderID string
	var orderNo int64
	err = tx.QueryRow(r.Context(), `INSERT INTO orders(user_id,total_amount,status,delivery_status,customer_name,customer_phone,customer_email,customer_address,customer_address1,customer_address2,customer_city,customer_state,customer_pincode) VALUES($1,0,'pending','pending',$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,order_no`, userID(r), in.CustomerName, in.CustomerPhone, in.CustomerEmail, in.CustomerAddress, in.CustomerAddress1, in.CustomerAddress2, in.CustomerCity, in.CustomerState, in.CustomerPincode).Scan(&orderID, &orderNo)
	if err != nil {
		Error(w, 400, "could not create order")
		return
	}
	var total float64
	for _, item := range in.Items {
		if item.ProductID == "" || item.Quantity < 1 {
			Error(w, 400, "invalid order item")
			return
		}
		var price float64
		if err = tx.QueryRow(r.Context(), `SELECT COALESCE(pp.wholesale_price,pp.retail_price) FROM product_prices pp WHERE pp.product_id=$1`, item.ProductID).Scan(&price); err != nil {
			Error(w, 400, "product price unavailable")
			return
		}
		if _, err = tx.Exec(r.Context(), `INSERT INTO order_items(order_id,order_no,product_id,quantity,price) VALUES($1,$2,$3,$4,$5)`, orderID, orderNo, item.ProductID, item.Quantity, price); err != nil {
			Error(w, 400, "could not save order items")
			return
		}
		total += price * float64(item.Quantity)
	}
	if _, err = tx.Exec(r.Context(), `UPDATE orders SET total_amount=$1 WHERE id=$2`, total, orderID); err != nil {
		Error(w, 500, "could not total order")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		Error(w, 500, "could not finalize order")
		return
	}
	var orderNumber string
	if err = s.DB.QueryRow(r.Context(), `SELECT order_no,order_number FROM orders WHERE id=$1`, orderID).Scan(&orderNo, &orderNumber); err != nil {
		Error(w, 500, "could not load created order")
		return
	}
	JSON(w, 201, map[string]any{"id": orderID, "order_no": orderNo, "order_number": orderNumber, "total_amount": total, "status": "pending"})
}

func (s *Controller) orderItems(r *http.Request, orderID string) ([]map[string]any, error) {
	rows, err := s.DB.Query(r.Context(), `SELECT oi.id,oi.product_id,oi.quantity,oi.price,oi.delivery_status,p.product_no,p.product_name,p.product_code,
COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.image_index LIMIT 1),'')
FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1 ORDER BY oi.id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var itemID, productID, name, code, image, deliveryStatus string
		var quantity int
		var price, productNo any
		if err := rows.Scan(&itemID, &productID, &quantity, &price, &deliveryStatus, &productNo, &name, &code, &image); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": itemID, "product_id": productID, "quantity": quantity, "price": price, "delivery_status": deliveryStatus,
			"products": map[string]any{"id": productID, "product_no": productNo, "product_name": name, "name": name, "product_code": code, "image_url": image},
		})
	}
	return items, rows.Err()
}

var _ = auth.Identity{}
