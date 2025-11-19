package crawler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	u "net/url"
	"strings"
	"sync"
	"time"

	"github.com/kemley76/web-crawl-vis/v2/parser"
	"github.com/temoto/robotstxt"
	"golang.org/x/sync/semaphore"
)

const MAX_CONCURRENT_REQS_PER_HOST = 5

type crawler struct {
	seedURLs        []string
	rw              http.ResponseWriter // Used to send responses to the client
	client          *http.Client        // Used to fetch data from the web pages its crawling
	dataChannel     chan pageData       // Used to forward data from the async crawling functions to the client
	visitedURLs     sync.Map
	robotsData      map[string]*robotstxt.RobotsData
	queues          map[string][]queueEntry // maps domains to URLs
	queueLock       sync.Mutex
	connectionAlive bool
	wg              sync.WaitGroup
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
		robotsData:      make(map[string]*robotstxt.RobotsData),
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
				fmt.Println("Crawled page:", data.Title)
				fmt.Fprint(c.rw, "data: ")
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
	fmt.Println("Done crawling!")
}

func (c *crawler) enqueuePage(rawURL string, depth int) {
	url, err := u.Parse(rawURL)
	if err != nil {
		panic("Invalid URL") // TODO: send error to user?
	}
	if url.Host == "" { // add on protocol in order to extract hostname
		url, err = u.Parse("https://" + rawURL)
		if err != nil {
			return
		}
	} else if url.Scheme == "" {
		url.Scheme = "https://"
	}
	url.Fragment = ""
	url.RawQuery = ""

	if _, ok := c.visitedURLs.Load(url.String()); ok {
		return // we have already visited this page
	}

	fmt.Printf("Queuing %s at depth %d\n", url.String(), depth)
	c.visitedURLs.Store(url, true)
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
}

// CrawlHost will crawl all the pages in the queue of a particular host up to a given depth
func (c *crawler) CrawlHost(hostname string, depth int) {
	robotsData := c.getRobotsData(hostname)
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

func (c *crawler) crawlPage(url, hostname string, depth int) {
	fmt.Println("Crawling page:", url)
	pd := pageData{
		URL: url,
	}

	res, err := http.Get(url)

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
		// only enqueue these links if the max depth has been reached...
		if depth > 0 {
			for _, link := range parseData.Links {
				if strings.HasPrefix(link, "/") {
					link = fmt.Sprintf("https://%s%s", hostname, link)
				} else if !strings.HasPrefix(link, "http") {
					continue
				}
				c.enqueuePage(link, depth-1)
			}
		}
		pd.LinksFound = len(parseData.Links)
		pd.Title = parseData.Title
	}

	c.dataChannel <- pd
}

func (c *crawler) getRobotsData(hostname string) *robotstxt.RobotsData {
	var data *robotstxt.RobotsData
	data, ok := c.robotsData[hostname]
	if !ok {
		fmt.Println("fetching robots data for:", hostname)
		res, err := http.Get(fmt.Sprintf("https://%s/robots.txt", hostname))
		if err != nil {
			panic("Error fetching robots.txt for " + hostname)
		}

		data, err = robotstxt.FromResponse(res)
		c.robotsData[hostname] = data
	}
	return data
}
