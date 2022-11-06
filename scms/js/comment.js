{
	const comment = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">comments</h2>
				<p class="page-links">
					<a href="comment">comments</a>
					<a href="comment-removed">removed</a>
				</p>
				<div v-if="comments && comments.length">
					<ul class="content-list">
						<li v-for="comment in comments" class="content-list__content">
							<div class="content-list__title-links">
								<h3 class="content-list__title">
									<a :href="'content-view?id=' + comment.contentid">{{comment.title}}</a>
								</h3>
								<p class="content-list__links">
									<a :href="'remove?id=' + comment.id" @click.prevent="remove(comment.id)">remove</a>
								</p>
							</div>
							<p v-html="comment.comment" class="content-list__text"></p>
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
				<p v-else>no comment!</p>
			</div>
		`,
		data() {
			return {
				fetching: true,
				comments: null,
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
					this.comments = null;
				}
				
				if (!page || page <= 0) page = 1;
				
				let list = await fetchGet(
					"comments/list",
					{limit: 5, offset: (page - 1) * 5, trim: 500},
				);
				this.comments = list.comments;
				
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
				let removed = await fetchDelete("comments/remove", {id: id});
				console.log(removed.message);
				if (removed.removed) this.list();
				this.unfetching = false;
			},
		},
	}).mount(".main");
}