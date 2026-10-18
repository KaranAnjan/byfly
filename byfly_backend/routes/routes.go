package routes

import (
	"github.com/byfly/byfly-backend/auth"
	"github.com/byfly/byfly-backend/config"
	"github.com/byfly/byfly-backend/controllers"
	"github.com/byfly/byfly-backend/middleware"
	"github.com/byfly/byfly-backend/service"
	"github.com/go-chi/chi/v5"
	"net/http"
)

func New(server *service.Server, controller *controllers.Controller, c config.Config) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RequestLog)
	r.Use(middleware.CORS(c.CORSOrigins))
	r.Use(auth.Middleware(c.JWTSecret, c.Env != "production"))
	r.Use(middleware.RateLimit(c.RequestsPerSecond))
	r.Get("/healthz", server.Health)
	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/login", controller.Login)
		r.Post("/auth/register", controller.Register)
		r.Post("/auth/firebase", controller.FirebaseLogin)
		r.Get("/categories", controller.Categories)
		r.Get("/products/search", controller.SearchProducts)
		r.Get("/products", controller.Products)
		r.Get("/products/{id}", controller.Product)
		r.Get("/images/*", controller.Image)
		r.Group(func(r chi.Router) {
			r.Use(auth.Require)
			r.Get("/me", controller.Me)
			r.Put("/me", controller.UpdateMe)
			r.Get("/cart", controller.Cart)
			r.Put("/cart", controller.PutCart)
			r.Delete("/cart/{productID}", controller.DeleteCart)
			r.Get("/wishlist", controller.Wishlist)
			r.Put("/wishlist/{productID}", controller.PutWishlist)
			r.Delete("/wishlist/{productID}", controller.DeleteWishlist)
			r.Get("/orders", controller.Orders)
			r.Post("/orders", controller.CreateOrder)
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireSuperadmin)
				r.Post("/admin/categories", controller.CreateCategory)
				r.Delete("/admin/categories/{id}", controller.DeleteCategory)
				r.Post("/admin/products", controller.SaveProduct)
				r.Put("/admin/products/{id}", controller.SaveProduct)
				r.Delete("/admin/products/{id}", controller.DeleteProduct)
				r.Post("/admin/uploads", controller.UploadImage)
				r.Post("/admin/products/{id}/images", controller.UploadProductImage)
				r.Delete("/admin/products/{id}/images/{imageID}", controller.DeleteProductImage)
				r.Put("/admin/products/{id}/stock", controller.UpdateStock)
				r.Get("/admin/orders", controller.AdminOrders)
				r.Get("/admin/orders/{id}", controller.AdminOrderDetail)
				r.Put("/admin/orders/{id}/status", controller.UpdateOrderStatus)
				r.Put("/admin/orders/{id}/items/{itemID}/status", controller.UpdateOrderItemStatus)
				r.Get("/admin/wholesale-accounts", controller.WholesaleAccounts)
				r.Post("/admin/wholesale-accounts", controller.CreateWholesaleAccount)
				r.Put("/admin/wholesale-accounts/{id}", controller.ToggleWholesaleAccount)
			})
		})
	})
	return r
}
