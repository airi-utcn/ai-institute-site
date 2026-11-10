const parseEmails = (value = '') =>
	value
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);

export default ({ env }) => {
	const adminSsoEmails = parseEmails(env('ADMIN_SSO_ALLOWED_EMAILS', ''));
	const adminSsoConfigured = Boolean(
		env('AZUREAD_TENANT_ID') &&
			env('AZUREAD_OAUTH_CLIENT_ID') &&
			env('AZUREAD_OAUTH_CLIENT_SECRET')
	);

	return {
		i18n: {
			enabled: true,
		},
		'strapi-plugin-sso': {
			enabled: adminSsoConfigured || env.bool('ADMIN_SSO_ONLY', false),
			config: {
				// Strapi always sets a refresh cookie. Remember-me additionally
				// keeps the access token across browser restarts.
				REMEMBER_ME: env.bool('ADMIN_SSO_REMEMBER_ME', false),
				// When ADMIN_SSO_ALLOWED_EMAILS is set, only those accounts may
				// sign in. The list is seeded into the plugin table on boot.
				USE_WHITELIST: env.bool(
					'ADMIN_SSO_USE_WHITELIST',
					adminSsoEmails.length > 0
				),
				AZUREAD_TENANT_ID: env('AZUREAD_TENANT_ID'),
				AZUREAD_OAUTH_CLIENT_ID: env('AZUREAD_OAUTH_CLIENT_ID'),
				AZUREAD_OAUTH_CLIENT_SECRET: env('AZUREAD_OAUTH_CLIENT_SECRET'),
				AZUREAD_OAUTH_REDIRECT_URI: env(
					'AZUREAD_OAUTH_REDIRECT_URI',
					'http://localhost:1337/strapi-plugin-sso/azuread/callback'
				),
				AZUREAD_SCOPE: env('AZUREAD_SCOPE', 'openid profile email'),
			},
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
	};
};
