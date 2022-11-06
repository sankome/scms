{
	let quill;
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 v-if="fetching" class="page-title">fetching</h2>
				<h2 v-else-if="content" class="page-title">edit content</h2>
				<h2 v-else class="page-title">add content</h2>
				<p v-if="content || add" class="page-links">
					<a v-if="content" :href="'content-view?id=' + id">view</a>
					<a :href="'content-save?id=' + id" @click.prevent="save(id)">save</a>
					<a v-if="content" :href="'content-remove?id=' + content.id" @click.prevent="remove(id)" class="remove">remove</a>
				</p>
				<div v-if="content || add">
					<p>title <input v-model="title"></p>
					<p>slug <input v-model="slug"></p>
					<p>
						<button @click.prevent="toggleDetails">
							{{details? "hide details": "show details"}}
						</button>
					</p>
					<div v-if="details">
						<p>date <input type="date" v-model="dateString"></p>
						<p>
							type 
							<select v-model="type">
								<option value="0">none</option>
								<option value="1">type 1</option>
								<option value="2">type 2</option>
								<option value="3">type 3</option>
								<option value="4">type 4</option>
								<option value="5">type 5</option>
							</select>
						</p>
						<p>
							category 
							<select v-model="category">
								<option value="0">none</option>
								<option value="1">category 1</option>
								<option value="2">category 2</option>
								<option value="3">category 3</option>
								<option value="4">category 4</option>
								<option value="5">category 5</option>
							</select>
						</p>
						<p>
							visibility 
							<select v-model="visible">
								<option value="0">public</option>
								<option value="1">private</option>
							</select>
						</p>
						<p>
							draft 
							<select v-model="draft">
								<option value="0">publish</option>
								<option value="1">draft</option>
							</select>
						</p>
						<p>
							list
							<select v-model="unlisted">
								<option value="0">listed</option>
								<option value="1">unlisted</option>
							</select>
						</p>
					</div>
				</div>
				<p v-else-if="fetching">fetching data...</p>
				<p v-else>content not found!</p>
				<div v-show="content || add"><div id="quill"></div></div>
			</div>
		`,
		data() {
			return {
				details: false,
				id: null,
				add: false,
				fetching: true,
				unfetching: false,
				content: false,
				date: null,
				title: null,
				slug: null,
				type: 0,
				category: 0,
				visible: 0,
				draft: 0,
				unlisted: 0,
			};
		},
		mounted() {
			quill = new Quill("#quill", {
				modules: {toolbar: {
					container: [
						["bold", "italic", "underline", "strike"],
						[{"header": [2, 3, false]}],
						[{"list": "ordered"}, {"list": "bullet"}],
						[{"color": []}, {"background": []}],
						["code", "code-block"],
						[{"script": "sub"}, {"script": "super"}],   
						["link"],
						["clean"],
					],
				}},
				theme: "snow",
			});
			this.view();
			
		},
		computed: {
			dateString: {
				get() {
					if (this.date) return stringDate(this.date);
					else return "";
				},
				set(date) {
					this.date = new Date(date);
				},
			},
		},
		methods: {
			undelta: undelta,
			async view() {
				this.fetching = true;
				let id = getParams().get("id") || this.id;
				if (id) {
					this.id = id;
					let content = await fetchGet("contents/view", {id: this.id});
					if (content.viewed) {
						this.content = true;
						this.dateString = content.content.date;
						this.title = content.content.title;
						this.slug = content.content.slug;
						this.type = content.content.type;
						this.category = content.content.category;
						this.visible = content.content.visible;
						this.draft = content.content.draft;
						this.unlisted = content.content.unlisted;
						quill.setContents(unjson(content.content.content));
						
					}
				} else {
					this.add = true;
					this.dateString = new Date();
					if (getParams().get("unlisted") != undefined) this.unlisted = 1;
				}
				this.fetching = false;
			},
			async save(id) {
				this.unfetching = true;
				if (this.add) {
					let added = await fetchPost(
						"contents/add",
						{
							title: this.title,
							date: this.date,
							slug: this.slug,
							type: this.type,
							category: this.category,
							content: json(quill.getContents()),
							text: quill.getText(),
							visible: this.visible,
							draft: this.draft,
							unlisted: this.unlisted,
						}
					);
					console.log(added.message);
					if (added.added) {
						this.id = added.id;
						window.history.pushState({}, null, "?id=" + String(this.id));
						this.add = false;
					}
				} else {
					let edited = await fetchPut(
						"contents/edit",
						{
							id: this.id,
							title: this.title,
							date: this.date,
							slug: this.slug,
							type: this.type,
							category: this.category,
							content: json(quill.getContents()),
							text: quill.getText(),
							visible: this.visible,
							draft: this.draft,
							unlisted: this.unlisted,
						}
					);
					console.log(edited.message);
					this.content = false;
				}
				this.view();
				this.unfetching = false;
			},
			async remove(id) {
				this.unfetching = true;
				let removed = await fetchDelete("contents/remove", {id: id});
				console.log(removed.message);
				this.unfetching = false;
				if (removed.removed) window.location.href = "contents";
			},
			toggleDetails() {
				this.details = !this.details;
			},
		},
	}).mount(".main");
}