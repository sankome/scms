{
	let quill;
	const content = createApp({
		template: `
			<div class="container" :class="{disabled: unfetching}">
				<h2 class="page-title">settings</h2>
				<ul v-if="settings" class="settings">
					<li class="settings__setting">
						<span>manage</span>
						<div class="settings__change">
							priv
							<select v-model="manage">
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
							<button @click.prevent="changeSetting('manage')">change</button>
						</div>
					</li>
					<li class="settings__setting">
						<span>create user</span>
						<div class="settings__change">
							priv
							<select v-model="create">
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
							<button @click.prevent="changeSetting('create')">change</button>
						</div>
					</li>
					<li class="settings__setting">
						<span>edit content</span>
						<div class="settings__change">
							priv
							<select v-model="edit">
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
							<button @click.prevent="changeSetting('edit')">change</button>
						</div>
					</li>
					<li class="settings__setting">
						<span>add comment</span>
						<div class="settings__change">
							priv
							<select v-model="comment">
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
							<button @click.prevent="changeSetting('comment')">change</button>
						</div>
					</li>
				</ul>
				<p v-else-if="fetching">fetching data...</p>
			</div>
		`,
		data() {
			return {
				fetching: true,
				unfetching: false,
				settings: null,
				manage: null,
				create: null,
				edit: null,
				comment: null,
			};
		},
		mounted() {
			this.getSettings();
		},
		methods: {
			async getSettings() {
				this.fetching = true;
				this.settings = null;
				this.manage = null;
				this.create = null;
				this.edit = null;
				this.comment = null;
				let settings = await fetchGet("settings/current");
				this.settings = {};
				for (setting of settings.settings) this.settings[setting.name] = setting.value;
				this.manage = parseInt(this.settings['manage']);
				this.create = parseInt(this.settings['create']);
				this.edit = parseInt(this.settings['edit']);
				this.comment = parseInt(this.settings['comment']);
				this.fetching = false;
			},
			async changeSetting(name) {
				this.unfetching = true;
				let changed = await fetchPut(
					"settings/change/",
					{
						name: name,
						value: this[name],
					}
				);
				console.log(changed.message);
				this.getSettings();
				this.unfetching = false;
			},
		},
	}).mount(".main");
}