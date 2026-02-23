import { atom } from 'nanostores';

interface Profile {
  username: string;
  bio: string;
  avatar: string;
}

const DEFAULT_PROFILE: Profile = {
  username: '',
  bio: '',
  avatar: '',
};

function loadStoredProfile(): Profile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  const storedProfile = localStorage.getItem('bolt_profile');

  if (!storedProfile) {
    return DEFAULT_PROFILE;
  }

  try {
    const parsed = JSON.parse(storedProfile) as Partial<Profile>;

    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      bio: typeof parsed.bio === 'string' ? parsed.bio : '',
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
    };
  } catch (error) {
    console.warn('Failed to parse stored profile, resetting profile data.', error);
    localStorage.removeItem('bolt_profile');

    return DEFAULT_PROFILE;
  }
}

// Initialize with stored profile or defaults
const initialProfile: Profile = loadStoredProfile();

export const profileStore = atom<Profile>(initialProfile);

export const updateProfile = (updates: Partial<Profile>) => {
  profileStore.set({ ...profileStore.get(), ...updates });

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(profileStore.get()));
  }
};
