package crawler

import (
	"encoding/json"
	"fmt"
	"net/http"
	u "net/url"
	"sync"
	"time"
)

const WAITTIME = time.Second * 2

type crawler struct {
	seedURLs        []string
	rw              http.ResponseWriter // Used to send responses to the client
	client          *http.Client        // Used to fetch data from the web pages its crawling
	dataChannel     chan pageData       // Used to forward data from the async crawling functions to the client
	visitedURLs     []string
	domainData      map[string]domainData
	queues          map[string][]string // maps domains to URLs
	queueLock       sync.Mutex
	connectionAlive bool
	wg              sync.WaitGroup
}

// NewCrawler creates a new crawler that will start from the given seed URLs
func NewCrawler(rw http.ResponseWriter, seedURLs []string) *crawler {
	return &crawler{
		seedURLs:        seedURLs,
		rw:              rw,
		client:          &http.Client{},
		dataChannel:     make(chan pageData),
		domainData:      make(map[string]domainData),
		queues:          make(map[string][]string), // maps domains to URLs
		connectionAlive: true,
	}
}

// Crawl will start crawling from the seed URLs up to the provided depth
func (c *crawler) Crawl(depth int, clientDone <-chan struct{}) {
	for _, url := range c.seedURLs {
		c.queuePage(url)
	}

	go func() {
		rc := http.NewResponseController(c.rw)
		for {
			select {
			case <-clientDone:
				c.connectionAlive = false
				fmt.Println("Connection closed")
				return
			case data := <-c.dataChannel:
				fmt.Println("Sending data: ", data)
				err := json.NewEncoder(c.rw).Encode(data)
				c.rw.Write([]byte("\n\n"))
				if err != nil {
					fmt.Println("Error encoding data:", data)
					return
				}
				rc.Flush()
			}
		}
	}()

	c.wg.Wait()
}

func (c *crawler) queuePage(rawURL string) {
	c.wg.Add(1)
	url, err := u.Parse(rawURL)
	if err != nil {
		panic("Invalid URL") // TODO: send error to user?
	}
	if url.Host == "" {
		url, err = u.Parse("http://" + rawURL)
	}

	c.queueLock.Lock()
	defer c.queueLock.Unlock()

	q, ok := c.queues[url.Host]
	if ok {
		c.queues[url.Host] = append(q, rawURL)
	} else {
		c.queues[url.Host] = []string{rawURL}
		go c.CrawlHost(url.Host)
	}
}

// CrawlPage will crawl an individual result
func (c *crawler) CrawlHost(hostname string) {
	fmt.Println("Crawling host: ", hostname)
	for c.crawlNextPage(hostname) {
		time.Sleep(WAITTIME)

		if !c.connectionAlive {
			break
		}
	}
}

// returns true if a page was found in the queue
func (c *crawler) crawlNextPage(hostname string) bool {
	c.queueLock.Lock()
	defer c.queueLock.Unlock()

	q, ok := c.queues[hostname]
	if !ok {
		return false
	} else if len(q) == 0 {
		delete(c.queues, hostname)
		return false
	}

	go c.crawlPage(q[0])
	c.queues[hostname] = q[1:]
	return true
}

func (c *crawler) crawlPage(url string) {
	defer c.wg.Done()
	println("Crawling page...", url)
	c.dataChannel <- pageData{
		URL:          url,
		Title:        "blah",
		ResponseTime: 0,
		Links:        []string{},
		Errors:       []string{},
	}
}
