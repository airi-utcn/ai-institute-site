export default () => ({
	i18n: {
		enabled: true,
	},
	upload: {
		config: {
			sizeLimit: 10 * 1024 * 1024, 
			security: {
				allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
				allowedExtensions: ['.jpg', '.png', '.pdf', '.jpeg','.png','.gif','.webp','.pdf','.txt','.md','.csv','.doc','.docx',	
					'.xls','.xlsx','.ppt','.pptx',],
				deniedTypes: ['application/x-msdownload', 'application/x-sh'],
				deniedExtensions: ['.exe', '.sh', '.bat', '.cmd', '.js', '.jar', '.msi', '.com', '.scr', '.pif', '.vb', '.vbs', '.wsf', '.wsh', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso', '.img', '.dmg', '.vhd', '.vmdk', '.ova', '.ovf'],
				maxFileSizeBytes: 10 * 1024 * 1024,
			},
		},
	},
});
