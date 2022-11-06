{
	const user = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">users</h2>
				<p class="page-links">
					<a href="user-create">add</a>
					<a href="user-password">change password</a>
				</p>
				<div v-if="users && users.length">
					<ul class="user-list">
						<li v-for="user in users" class="user-list__user">
							<div class="user-list__info">
								<h3>{{user.username}}</h3>
								<p>{{user.main? "(main)": (user.manage? "(manage)": "")}}</p>
							</div>
							<div class="user-list__priv">
								priv
								<select v-model="user.priv">
									<option value="0">0</option>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4</option>
									<option value="5">5</option>
									<option value="6">6</option>
									<option value="7">7</option>
									<option value="8">8</option>
									<option value="9">9</option>
									<option value="10">10</option>
								</select>
								<button @click.prevent="changePriv(user.id, user.priv)">change</button>
							</div>
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
				<p v-else>no user!</p>
			</div>
		`,
		data() {
			return {
				fetching: true,
				users: null,
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
					this.users = null;
				}
				
				if (!page || page <= 0) page = 1;
				
				let list = await fetchGet(
					"users/list",
					{limit: 5, offset: (page - 1) * 5},
				);
				this.users = list.users;
				
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
				
				this.fetching = false;
				this.unfetching = false;
			},
			async changePriv(id, priv) {
				this.unfetching = true;
				let changed = await fetchPut("users/priv", {id: id, priv: priv});
				console.log(changed.message);
				if (changed.changed)this.list();
				this.unfetching = false;
			},
		},
	}).mount(".main");
}