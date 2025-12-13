package web

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

func crawl(rw http.ResponseWriter, r *http.Request) {
	seeds := strings.Split(r.URL.Query().Get("seeds"), ",")
	depth := r.URL.Query().Get("depth")
	depthParsed, err := strconv.Atoi(depth)
	if err != nil {
		depthParsed = 1
	}
	delay := r.URL.Query().Get("delay")
	delayParsed, err := strconv.Atoi(delay)
	if err != nil {
		delayParsed = 400
	}

	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Transfer-Encoding", "chunked")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Connection", "keep-alive")

	crawler := crawler.NewCrawler(rw, seeds)
	crawler.Crawl(depthParsed, delayParsed, r.Context().Done())
}
