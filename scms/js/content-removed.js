{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">removed</h2>
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
									<a :href="'restore?id=' + content.id" @click.prevent="restore(content.id)">restore</a>
								</p>
							</div>
							<p v-html="content.text" class="content-list__text"></p>
						</li>
					</ul>
					<ul class="paging">
						<li><a @click.prevent="removed(1)" href="?page=1">&lt;&lt;</a></li>
						<li v-for="i in pages">
							<span v-if="i == current">{{i}}</span>
							<a v-else @click.prevent="removed(i)" :href="'?page=' + i">{{i}}</a>
						</li>
						<li><a @click.prevent="removed(lastPage)" :href="'?page=' + lastPage">&gt;&gt;</a></li>
					</ul>
				</div>
				<p v-else-if="fetching">fetching data...</p>
				<p v-else>no content!</p>
			</div>
		`,
		data() {
			return {
				fetching: true,
				unfetching: false,
				contents: null,
				current: null,
				pages: null,
			};
		},
		mounted() {
			this.removed(getParams().get("page"));
		},
		methods: {
			async removed(page) {
				if (page) this.unfetching = true;
				else {
					this.fetching = true;
					this.contents = null;
				}
				
				if (!page || page <= 0) page = 1;
				
				let removed = await fetchGet(
					"contents/removed",
					{limit: 5, offset: (page - 1) * 5, trim: 200},
				);
				this.contents = removed.contents;
				
				let count = removed.count;
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
			async restore(id) {
				this.unfetching = true;
				let restore = await fetchPost("contents/restore", {id: id});
				console.log(restore.message);
				if (restore.restored)this.removed();
				this.unfetching = false;
			},
		},
	}).mount(".main");
}