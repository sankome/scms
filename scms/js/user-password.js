{
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">change password</h2>
				<form @submit.prevent="change">
					<p>current  <input type="password" v-model="current"></p>
					<p>new <input type="password" v-model="password"></p>
					<p><input type="submit" value="login"></p>
				</form>
			</div>
		`,
		data() {
			return {
				unfetching: false,
				current: null,
				password: null,
			};
		},
		methods: {
			async change() {
				this.unfetching = true;
				let change = await fetchPut(
					"users/password/",
					{
						current: this.current,
						password: this.password,
					},
				);
				if (change.changed) window.location.href = ".";
				else console.log(change.message);
				this.unfetching = false;
			},
		},
	}).mount(".main");
	
}