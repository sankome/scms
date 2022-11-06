{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 v-if="content" class="page-title">{{content.title}}</h2>
				<h2 v-else-if="fetching" class="page-title">fetching data...</h2>
				<h2 v-else class="page-title">content not found!</h2>
				<p v-if="content" class="page-links">
					<a :href="'content-edit?id=' + content.id">edit</a>
					<a :href="'content-remove?id=' + content.id" @click.prevent="remove(content.id)" class="remove">remove</a>
				</p>
				<div v-if="content" v-html="undelta(content.content)"></div>
			</div>
		`,
		data() {
			return {
				id: null,
				fetching: true,
				unfetching: false,
				content: null,
			};
		},
		async mounted() {
			this.id = getParams().get("id");
			this.getContent();
		},
		methods: {
			undelta: undelta,
			async getContent() {
				this.fetching = true;
				let content = await fetchGet("contents/view", {id: this.id});
				this.content = content.content;
				this.fetching = false;
			},
			async remove(id) {
				this.unfetching = true;
				let removed = await fetchDelete("contents/remove", {id: id});
				console.log(removed.message);
				if (removed.removed) window.location.href = "contents";
				this.unfetching = false;
			},
		},
	}).mount(".main");
}