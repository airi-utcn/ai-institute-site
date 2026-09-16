export default () => ({
	i18n: {
		enabled: true,
	},
	upload: {
		config: {
			sizeLimit: 10 * 1024 * 1024, // 10MB limit handled by upload plugin constraints
		},
	},
});
