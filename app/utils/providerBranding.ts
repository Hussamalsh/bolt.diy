export const providerBranding = {
  vercel: {
    iconClassName: 'text-black dark:text-white',
    connectButtonClassName:
      'bg-black text-white hover:bg-gray-800 hover:text-white dark:bg-white dark:text-black dark:hover:bg-gray-200',
  },
  gitlab: {
    iconClassName: 'text-[#FC6D26]',
    connectButtonClassName: 'bg-[#FC6D26] text-white hover:bg-[#E24329] hover:text-white',
  },
  netlify: {
    iconClassName: 'text-[#00AD9F]',
    connectButtonClassName: 'bg-[#00AD9F] text-white hover:bg-[#00857A] hover:text-white',
  },
} as const;
