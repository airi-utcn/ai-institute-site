export default ({ env }) => ({
	email: {
		config: {
			provider: 'nodemailer',
			providerOptions: {
				host: env('SMTP_HOST', 'localhost'),
				port: env.int('SMTP_PORT', 587),
				secure: env.bool('SMTP_SECURE', false),
				auth: {
					user: env('SMTP_USER', ''),
					pass: env('SMTP_PASS', ''),
				},
			},
			settings: {
				defaultFrom: env('SMTP_FROM', 'no-reply@example.org'),
				defaultReplyTo: env('SMTP_REPLY_TO', env('SMTP_FROM', 'no-reply@example.org')),
			},
		},
	},
});
