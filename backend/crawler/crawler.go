package crawler

import "net/http"

type crawler struct {
	seedURLs    []string
	rw          http.ResponseWriter // Used to send responses to the client
	client      http.Client         // Used to fetch data from the web pages its crawling
	dataChannel chan pageData       // Used to forward data from the async crawling functions to the client
	visitedURLs []string
	domainData  map[string]domainData
}

// NewCrawler creates a new crawler that will start from the given seed URLs
func NewCrawler(rw http.ResponseWriter, seedURLs []string) *crawler {
	return &crawler{
		seedURLs: seedURLs,
		rw:       rw,
		// TODO: create http client
		dataChannel: make(chan pageData),
		domainData:  make(map[string]domainData),
	}
}

// Crawl will start crawling from the seed URLs up to the provided depth
func (c *crawler) Crawl(depth int) {

}

// CrawlPage will crawl an individual result
func (c *crawler) CrawlPage(url string) {

}

// sendDataToClient will send the provided pageData to the client via an SSE
func (c *crawler) sendDataToClient(data pageData) {

}
