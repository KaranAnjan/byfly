package controllers

import (
	"github.com/go-chi/chi/v5"
	"net/http"
)

func (s *Controller) UpdateStock(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RetailStock    int `json:"retail_stock"`
		WholesaleStock int `json:"wholesale_stock"`
	}
	if decode(r, &in) != nil || in.RetailStock < 0 || in.WholesaleStock < 0 {
		Error(w, 400, "valid stock quantities are required")
		return
	}
	if _, err := s.DB.Exec(r.Context(), `INSERT INTO product_stock(product_id,retail_quantity,wholesale_quantity) VALUES($1,$2,$3) ON CONFLICT(product_id) DO UPDATE SET retail_quantity=EXCLUDED.retail_quantity,wholesale_quantity=EXCLUDED.wholesale_quantity,updated_at=now()`, chi.URLParam(r, "id"), in.RetailStock, in.WholesaleStock); err != nil {
		Error(w, 400, "could not update stock")
		return
	}
	w.WriteHeader(204)
}
func (s *Controller) AdminOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT id,order_no,order_number,total_amount,status,delivery_status,customer_name,customer_address,customer_pincode,created_at FROM orders ORDER BY created_at DESC`)
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

func (s *Controller) AdminOrderDetail(w http.ResponseWriter, r *http.Request) {
	var id, num, status, delivery, name, address, pin string
	var orderNo int64
	var total, created any
	err := s.DB.QueryRow(r.Context(), `SELECT id,order_no,order_number,total_amount,status,delivery_status,customer_name,customer_address,customer_pincode,created_at FROM orders WHERE id=$1 OR order_no::text=$1 OR order_number=$1`, chi.URLParam(r, "id")).Scan(&id, &orderNo, &num, &total, &status, &delivery, &name, &address, &pin, &created)
	if err != nil {
		Error(w, 404, "order not found")
		return
	}
	items, err := s.orderItems(r, id)
	if err != nil {
		Error(w, 500, "could not load order items")
		return
	}
	for _, item := range items {
		item["order_no"] = orderNo
	}
	JSON(w, 200, map[string]any{"id": id, "order_no": orderNo, "order_number": num, "total_amount": total, "status": status, "delivery_status": delivery, "customer_name": name, "customer_address": address, "customer_pincode": pin, "created_at": created, "order_items": items})
}
func (s *Controller) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status         string `json:"status"`
		DeliveryStatus string `json:"delivery_status"`
	}
	if decode(r, &in) != nil {
		Error(w, 400, "invalid status")
		return
	}
	_, err := s.DB.Exec(r.Context(), `UPDATE orders SET status=COALESCE(NULLIF($1,''),status),delivery_status=COALESCE(NULLIF($2,''),delivery_status),updated_at=now() WHERE id=$3`, in.Status, in.DeliveryStatus, chi.URLParam(r, "id"))
	if err != nil {
		Error(w, 400, "could not update order")
		return
	}
	w.WriteHeader(204)
}

func (s *Controller) UpdateOrderItemStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		DeliveryStatus string `json:"delivery_status"`
	}
	if decode(r, &in) != nil {
		Error(w, 400, "invalid status")
		return
	}
	allowed := map[string]bool{"pending": true, "packed": true, "shipped": true, "out_for_delivery": true, "delivered": true, "cancelled": true}
	if !allowed[in.DeliveryStatus] {
		Error(w, 400, "invalid item delivery status")
		return
	}
	_, err := s.DB.Exec(r.Context(), `UPDATE order_items SET delivery_status=$1 WHERE id=$2 AND order_id=$3`, in.DeliveryStatus, chi.URLParam(r, "itemID"), chi.URLParam(r, "id"))
	if err != nil {
		Error(w, 400, "could not update order item")
		return
	}
	if err := s.syncOrderDeliveryStatus(r, chi.URLParam(r, "id")); err != nil {
		Error(w, 500, "could not update order delivery status")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Controller) syncOrderDeliveryStatus(r *http.Request, orderID string) error {
	_, err := s.DB.Exec(r.Context(), `UPDATE orders o SET delivery_status=(CASE
		WHEN (SELECT COUNT(*) FROM order_items WHERE order_id=o.id AND delivery_status='delivered')=(SELECT COUNT(*) FROM order_items WHERE order_id=o.id) AND (SELECT COUNT(*) FROM order_items WHERE order_id=o.id)>0 THEN 'delivered'
		WHEN (SELECT COUNT(*) FROM order_items WHERE order_id=o.id AND delivery_status='cancelled')=(SELECT COUNT(*) FROM order_items WHERE order_id=o.id) AND (SELECT COUNT(*) FROM order_items WHERE order_id=o.id)>0 THEN 'cancelled'
		WHEN (SELECT COUNT(*) FROM order_items WHERE order_id=o.id AND delivery_status='delivered')>0 THEN 'partially_delivered'
		WHEN (SELECT COUNT(DISTINCT delivery_status) FROM order_items WHERE order_id=o.id)=1 THEN (SELECT delivery_status FROM order_items WHERE order_id=o.id LIMIT 1)
		ELSE o.delivery_status END), updated_at=now() WHERE o.id=$1`, orderID)
	return err
}
