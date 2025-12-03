package web

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/kemley76/web-crawl-vis/v2/crawler"
)

func RunServer() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.HandleFunc("/crawl", crawl)
	r.Handle("/*", http.FileServer(http.Dir("../public/")))

	fmt.Println("Server running at localhost:3000")
	http.ListenAndServe(":3000", r)
}

type CrawlRequest struct {
	URLs []string `json:"urls"`
}

func crawl(rw http.ResponseWriter, r *http.Request) {
	var crawlRequest CrawlRequest
	err := json.NewDecoder(r.Body).Decode(&crawlRequest)
	if err != nil {
		fmt.Fprintf(rw, "Error parsing request: %v", err)
	}
	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Transfer-Encoding", "chunked")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Connection", "keep-alive")

	crawler := crawler.NewCrawler(rw, crawlRequest.URLs)
	crawler.Crawl(2, r.Context().Done())
}
