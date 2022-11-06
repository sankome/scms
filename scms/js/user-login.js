{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">login</h2>
				<form @submit.prevent="login">
					<p>username <input type="text" v-model="username"></p>
					<p>password <input type="password" v-model="password"></p>
					<p><input type="submit" value="login"></p>
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
			async login() {
				this.unfetching = true;
				let login = await fetchPost(
					"users/login",
					{
						username: this.username,
						password: this.password,
					},
				);
				if (login.login) window.location.href = ".";
				else console.log(login.message);
				this.unfetching = false;
			},
		},
	}).mount(".main");
}