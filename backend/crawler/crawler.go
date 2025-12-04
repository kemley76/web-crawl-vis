package crawler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	u "net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/kemley76/web-crawl-vis/v2/parser"
	"github.com/temoto/robotstxt"
	"golang.org/x/sync/semaphore"
)

const MAX_CONCURRENT_REQS_PER_HOST = 5

var client http.Client

func init() {
	client = http.Client{Timeout: time.Second * 3}
}

type crawler struct {
	seedURLs        []string
	rw              http.ResponseWriter // Used to send responses to the client
	client          *http.Client        // Used to fetch data from the web pages its crawling
	dataChannel     chan pageData       // Used to forward data from the async crawling functions to the client
	visitedURLs     sync.Map
	robotsData      sync.Map                // map[string]*robotstxt.RobotsData
	queues          map[string][]queueEntry // maps domains to URLs
	queueLock       sync.Mutex
	connectionAlive bool
	wg              sync.WaitGroup
	id_counter      atomic.Uint64
}

type queueEntry struct {
	url   string
	depth int
}

// NewCrawler creates a new crawler that will start from the given seed URLs
func NewCrawler(rw http.ResponseWriter, seedURLs []string) *crawler {
	return &crawler{
		seedURLs:        seedURLs,
		rw:              rw,
		client:          &http.Client{},
		dataChannel:     make(chan pageData),
		queues:          make(map[string][]queueEntry), // maps domains to URLs
		connectionAlive: true,
	}
}

// Crawl will start crawling from the seed URLs up to the provided depth
func (c *crawler) Crawl(depth int, clientDone <-chan struct{}) {
	for _, url := range c.seedURLs {
		c.enqueuePage(url, depth) // starting with depth and counting down
	}

	flusher, ok := c.rw.(http.Flusher)
	if !ok {
		panic("provided http.ResponseWriter is not a http.Flusher")
	}

	go func() {
		flusher.Flush()
		for {
			select {
			case <-clientDone:
				c.connectionAlive = false
				fmt.Println("Connection closed")
				return
			case data := <-c.dataChannel:
				fmt.Println("Crawled page:", data.Title, data.URL)
				fmt.Fprint(c.rw, "event: data\ndata: ")
				err := json.NewEncoder(c.rw).Encode(data)
				if err != nil {
					fmt.Println("Error encoding data", err)
					return
				}

				fmt.Fprint(c.rw, "\n")
				flusher.Flush()
				c.wg.Done()
			}
		}
	}()

	c.wg.Wait()
	c.visitedURLs.Range(func(key, value any) bool {
		fmt.Println("Key", key, "value", value)
		return true
	})

	fmt.Fprint(c.rw, "event: close\ndata: \n\n")
	flusher.Flush()
	fmt.Println("Done crawling!")
}

func (c *crawler) enqueuePage(rawURL string, depth int) (uint64, error) {
	url, err := cleanURL(rawURL, "")
	if err != nil {
		return 0, err
	}

	if id, ok := c.getNodeID(url.String()); ok {
		return id, nil
	}

	fmt.Printf("Queuing %s at depth %d\n", url.String(), depth)
	id := c.id_counter.Add(1)
	c.visitedURLs.Store(url.String(), id)
	c.wg.Add(1)

	c.queueLock.Lock()
	defer c.queueLock.Unlock()

	q, ok := c.queues[url.Host]
	if ok {
		c.queues[url.Host] = append(q, queueEntry{url.String(), depth})
	} else {
		c.queues[url.Host] = []queueEntry{{url.String(), depth}}
		// Maybe try to change this out so that CrawlHost function never finishes until its actually all done
		go c.CrawlHost(url.Host, depth)
	}
	return id, nil
}

// CrawlHost will crawl all the pages in the queue of a particular host up to a given depth
func (c *crawler) CrawlHost(hostname string, depth int) {
	robotsData := c.getRobotsData(hostname)
	if robotsData == nil {
		robotsData = &robotstxt.RobotsData{}
	}
	waittime := robotsData.FindGroup("")
	fmt.Println("Crawling host: ", hostname)

	sem := semaphore.NewWeighted(MAX_CONCURRENT_REQS_PER_HOST)
	for c.connectionAlive {
		url, depth := c.getNextURL(hostname)
		if url == "" {
			break
		}

		if !robotsData.TestAgent(url, "Go-http-client/1.1") {
			c.dataChannel <- pageData{
				URL:    url,
				Errors: []string{"Path blocked by robots.txt"},
			}
			continue // we can't crawl this page
		}
		sem.Acquire(context.Background(), 1)
		go func() {
			defer sem.Release(1)
			c.crawlPage(url, hostname, depth)
		}()
		time.Sleep(waittime.CrawlDelay)
	}
}

// gets the next URL in the queue for a given hostname
func (c *crawler) getNextURL(hostname string) (string, int) {
	c.queueLock.Lock()
	defer c.queueLock.Unlock()

	q, ok := c.queues[hostname]
	if !ok {
		return "", 0
	} else if len(q) == 0 {
		delete(c.queues, hostname)
		return "", 0
	}

	qe := q[0]
	c.queues[hostname] = q[1:]
	return qe.url, qe.depth
}

func (c *crawler) crawlPage(rawURL, hostname string, depth int) {
	id, _ := c.getNodeID(rawURL)
	pd := pageData{
		URL: rawURL,
		ID:  id,
	}

	start := time.Now()
	res, err := client.Get(rawURL)
	pd.ResponseTime = int(time.Since(start).Milliseconds())

	if err != nil {
		pd.AddError("Error fetching page: " + err.Error())
		c.dataChannel <- pd
		return
	}

	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		pd.AddError("Error fetching page: " + res.Status)
	} else {
		parseData := parser.ParseHTML(res.Body)
		pd.Neighbors = make([]uint64, 0, len(parseData.Links))
		for _, link := range parseData.Links {
			url, err := cleanURL(link, hostname)
			if err != nil {
				continue
			}
			if depth > 0 {
				// only enqueue these links if the max depth has not been reached
				id, err := c.enqueuePage(url.String(), depth-1)
				if err == nil {
					pd.Neighbors = append(pd.Neighbors, id)
				} else {
					pd.Errors = append(pd.Errors, err.Error())
				}
			} else {
				id, ok := c.getNodeID(url.String())
				if ok {
					pd.Neighbors = append(pd.Neighbors, id)
				}
			}
		}
		pd.LinksFound = len(parseData.Links)
		pd.Title = parseData.Title
	}

	c.dataChannel <- pd
}

func (c *crawler) getRobotsData(hostname string) *robotstxt.RobotsData {
	var data *robotstxt.RobotsData
	res, ok := c.robotsData.Load(hostname)
	if ok {
		return res.(*robotstxt.RobotsData)
	} else {
		fmt.Println("Fetching robots data for:", hostname)
		res, err := client.Get(fmt.Sprintf("https://%s/robots.txt", hostname))
		if err == nil {
			data, err = robotstxt.FromResponse(res)
			if err != nil {
				fmt.Printf("Error parsing robots.txt for %s: %s\n", hostname, err.Error())
			}
		}
		c.robotsData.Store(hostname, data)
	}
	return data
}

func (c *crawler) getNodeID(url string) (uint64, bool) {
	if id, ok := c.visitedURLs.Load(url); ok {
		if id_int, ok := id.(uint64); ok {
			return id_int, true
		}
		panic("get node id: cannot convert to uint64")
	}
	return 0, false
}

func cleanURL(rawURL string, hostname string) (*u.URL, error) {
	if strings.HasPrefix(rawURL, "/") {
		rawURL = fmt.Sprintf("https://%s%s", hostname, rawURL)
	} else if !strings.HasPrefix(rawURL, "http") {
		return nil, fmt.Errorf("Error cleaning URL: %s", rawURL)
	}
	url, err := u.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if url.Host == "" { // add on protocol in order to extract hostname
		url, err = u.Parse("https://" + rawURL)
		if err != nil {
			return nil, err
		}
	} else if url.Scheme == "" {
		url.Scheme = "https://"
	}
	url.Fragment = ""
	url.RawQuery = ""
	return url, nil
}
