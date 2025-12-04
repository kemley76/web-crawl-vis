function test() {
	const textField = document.getElementById("text-field");
	const urls = [textField.value];
	const url = new URL("/crawl", document.location);
	url.searchParams.append("seeds", urls.join(","));
	const evtSource = new EventSource(url.toString());
	const eventList = document.getElementById("event-list");
	eventList.innerHTML = "";

	evtSource.addEventListener("close", (_) => {
		evtSource.close();
		console.log("Done crawling!");
	});
	evtSource.addEventListener("data", (event) => {
		const newElement = document.createElement("li");
		const eventList = document.getElementById("event-list");

		const json = JSON.parse(event.data);
		if (!json.errors || json.errors.length === 0) {
			newElement.innerHTML = `<li>${json.title}
				<ul>
					<li>ID: ${json.id}</li>
					<li>URL: <a href=${json.url}>${json.url}</a></li>
					<li>Neighbors: ${json.neighbors}</li>
				<ul>
			</li>`;
		} else {
			newElement.innerHTML = `<li>Error
				<ul>
					<li>URL: <a href=${json.url}>${json.url}</a></li>
					<li>Errors: ${json.errors}</li>
				<ul>
			</li>`;
			newElement.style.color = "red";
		}
		eventList.appendChild(newElement);
	});
}


const btn = document.getElementById("test-btn");
btn.onclick = test;
