{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">create user</h2>
				<form @submit.prevent="create">
					<p>username <input type="text" v-model="username"></p>
					<p>password <input type="password" v-model="password"></p>
					<p><input type="submit" value="create"></p>
				</form>
			</div>
		`,
		data() {
			return {
				unfetching: false,
				username: null,
				password: null,
			};
		},
		methods: {
			async create() {
				this.unfetching = true;
				let create = await fetchPost(
					"users/create",
					{
						username: this.username,
						password: this.password,
					},
				);
				console.log(create.message);
				if (create.created) window.location.href = ".";
				this.unfetching = false;
			},
		},
	}).mount(".main");
}