{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">contents</h2>
				<p class="page-links">
					<a href="content-edit">add</a>
					<a href="content-search">search</a>
					<a href="content">contents</a>
					<a href="content-removed">removed</a>
				</p>
				<div v-if="contents && contents.length">
					<ul class="content-list">
						<li v-for="content in contents" class="content-list__content">
							<div class="content-list__title-links">
								<h3 class="content-list__title">
									<a :href="'content-view?id=' + content.id">{{content.title}}</a>
								</h3>
								<p class="content-list__links">
									<a :href="'content-edit?id=' + content.id">edit</a>
									<a :href="'content-remove?id=' + content.id" @click.prevent="remove(content.id)">remove</a>
								</p>
							</div>
							<p v-html="content.text" class="content-list__text"></p>
						</li>
					</ul>
					<ul class="paging">
						<li><a @click.prevent="list(1)" href="?page=1">&lt;&lt;</a></li>
						<li v-for="i in pages">
							<span v-if="i == current">{{i}}</span>
							<a v-else @click.prevent="list(i)" :href="'?page=' + i">{{i}}</a>
						</li>
						<li><a @click.prevent="list(lastPage)" :href="'?page=' + lastPage">&gt;&gt;</a></li>
					</ul>
				</div>
				<p v-else-if="fetching">fetching data...</p>
				<p v-else>no content!</p>
			</div>
		`,
		data() {
			return {
				fetching: true,
				contents: null,
				unfetching: false,
				current: null,
				pages: null,
			};
		},
		mounted() {
			this.list(getParams().get("page"));
		},
		methods: {
			async list(page) {
				if (page) this.unfetching = true;
				else {
					this.fetching = true;
					this.contents = null;
				}
				
				if (!page || page <= 0) page = 1;
				
				let list = await fetchGet(
					"contents/list",
					{limit: 5, offset: (page - 1) * 5, trim: 200},
				);
				this.contents = list.contents;
				
				let count = list.count;
				this.lastPage = 1 + Math.floor((count - 1) / 5);
				if (page > this.lastPage) page = this.lastPage;
				
				this.current = page;
				let prev = Math.max(1, page - 2);
				let next = Math.min(this.lastPage, page + 2);
				this.pages = {};
				for (let i = prev; i <= next; i++) this.pages[i] = i;
				
				if (this.current == 1) window.history.pushState({}, null, "?");
				else window.history.pushState({}, null, "?page=" + String(this.current));
				
				this.unfetching = false;
				this.fetching = false;
			},
			async remove(id) {
				this.unfetching = true;
				let removed = await fetchDelete("contents/remove", {id: id});
				console.log(removed.message);
				if (removed.removed) this.list();
				this.unfetching = false;
			},
		},
	}).mount(".main");
}