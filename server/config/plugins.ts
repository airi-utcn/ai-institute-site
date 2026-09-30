export default ({ env }) => ({
	i18n: {
		enabled: true,
	},
	upload: {
		config: {
			sizeLimit: 10 * 1024 * 1024, // 10MB limit handled by upload plugin constraints
		},
	},
	email: {
		config: {
			provider: 'nodemailer',
			providerOptions: {
				host: env('SMTP_HOST', 'smtp.example.com'),
				port: env.int('SMTP_PORT', 587),
				auth: {
					user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
				},
				// ... any custom nodemailer options
			},
			settings: {
				defaultFrom: env('SMTP_DEFAULT_FROM', 'alerts@yourdomain.com'),
				defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'alerts@yourdomain.com'),
			},
		},
	},
});
