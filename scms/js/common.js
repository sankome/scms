//vue
const createApp = Vue.createApp;

//quill+undelta
let quill = new Quill(document.createElement("div"));
function undelta(delta) {
	quill.setContents(unjson(delta));
	return quill.root.innerHTML;
}
function getParams() {return new URLSearchParams(window.location.search);}
function unjson(string) {return JSON.parse(string);}
function json(object) {return JSON.stringify(object);}

//date to string
function stringDate(date) {
	let year = String(date.getFullYear());
	let month = String(date.getMonth() + 1).padStart(2, "0");
	let day = String(date.getDate()).padStart(2, "0");
	return [year, month ,day].join("-");
}

//get+post+put+delete
async function fetchGet(resource, body) {
	if (!body) body = {};
	let params = new URLSearchParams(body);
	let response = await fetch(resource + "?" + params, {
		credentials: "include",
		method: "GET",
		headers: {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
	});
	let json = await response.json();
	return json;
}
async function fetchPost(resource, body) {
	if (!body) body = {};
	let response = await fetch(resource, {
		credentials: "include",
		method: "POST",
		headers: {"Accept": "application/json", "Content-Type": "application/json"},
		body: JSON.stringify(body),
	});
	let json = await response.json();
	return json;
}
async function fetchPut(resource, body) {
	if (!body) body = {};
	let response = await fetch(resource, {
		credentials: "include",
		method: "PUT",
		headers: {"Accept": "application/json", "Content-Type": "application/json"},
		body: JSON.stringify(body),
	});
	let json = await response.json();
	return json;
}
async function fetchDelete(resource, body) {
	if (!body) body = {};
	let response = await fetch(resource, {
		credentials: "include",
		method: "DELETE",
		headers: {"Accept": "application/json", "Content-Type": "application/json"},
		body: JSON.stringify(body),
	});
	let json = await response.json();
	return json;
}

{
	//common layout
	const scms = createApp({
		template: `
			<header class="header" :class="{'header--show': headerShow}">
				<button @click="toggleHeader" class="header__toggle">
					<div></div>
					<div></div>
				</button>
				<button @click="closeHeader" class="header__close"></button>
				<div class="header__title"><h1 class="header-title">scms</h1></div>
				<nav class="header__nav">
					<ul>
						<li><a href=".">home</a></li>
						<li><a href="user">users</a></li>
						<li><a href="content">contents</a></li>
						<li><a href="comment">comments</a></li>
						<li><a href="setting">settings</a></li>
						<li><a href="logout" @click.prevent="logout">logout</a></li>
					</ul>
				</nav>
			</header>
			<main class="main" :class="{disabled: unfetching}" @message="console.log(1)"></main>
		`,
		data() {
			return {
				headerShow: false,
				unfetching: false,
			};
		},
		methods: {
			toggleHeader() {
				this.headerShow = !this.headerShow;
			},
			closeHeader() {
				this.headerShow = false;
			},
			async logout() {
				this.unfetching = true;
				let logout = await fetchDelete("users/logout");
				if (logout.logout) window.location.reload();
				this.unfetching = false;
			},
		},
		emits: ["message"],
	}).mount("#scms");
}