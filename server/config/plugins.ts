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
				// Do not let a slow or unavailable SMTP server block the
				// reservation request that triggered the email.
				connectionTimeout: 10_000,
				greetingTimeout: 10_000,
				socketTimeout: 20_000,
				// ... any custom nodemailer options
			},
			settings: {
				defaultFrom: env('SMTP_DEFAULT_FROM', 'alerts@yourdomain.com'),
				defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'alerts@yourdomain.com'),
			},
		},
	},
});
