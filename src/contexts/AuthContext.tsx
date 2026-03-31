import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  fetchGitHubRepositories,
  fetchGitHubUserData,
  type GitHubUserData,
  type GitHubRepository,
} from "../services/githubService";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername?: string;
  githubId?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  createdAt: Date;
  lastLoginAt: Date;
  repositories?: GitHubRepository[];
  preferences?: {
    theme?: "light" | "dark";
    notifications?: boolean;
    language?: string;
  };
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function mapGitHubDataToProfile(
  githubData: GitHubUserData,
  repositories: GitHubRepository[]
): UserProfile {
  return {
    uid: githubData.id.toString(),
    email: githubData.email ?? null,
    displayName: githubData.name || githubData.login,
    photoURL: githubData.avatar_url,
    githubUsername: githubData.login,
    githubId: githubData.id.toString(),
    bio: githubData.bio || "",
    location: githubData.location || "",
    website: githubData.blog || "",
    company: githubData.company || "",
    publicRepos: githubData.public_repos,
    followers: githubData.followers,
    following: githubData.following,
    createdAt: new Date(githubData.created_at),
    lastLoginAt: new Date(),
    repositories,
    preferences: {
      theme: "dark",
      notifications: true,
      language: "en",
    },
  };
}

async function fetchGitHubViewerWithToken(
  token: string
): Promise<GitHubUserData | null> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GitHubUserData;
  return data;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const envToken = import.meta.env.VITE_GITHUB_TOKEN?.trim() || "";
    const envUsername = import.meta.env.VITE_GITHUB_USERNAME?.trim() || "";

    setLoading(true);
    setError(null);

    try {
      let githubData: GitHubUserData | null = null;

      if (envToken) {
        githubData = await fetchGitHubViewerWithToken(envToken);
      }

      if (!githubData && envUsername) {
        githubData = await fetchGitHubUserData(envUsername);
      }

      if (!githubData) {
        setUserProfile(null);
        setError(
          "Could not load GitHub profile from .env. Set VITE_GITHUB_TOKEN or VITE_GITHUB_USERNAME in backend/.env."
        );
        return;
      }

      const repositories = await fetchGitHubRepositories(
        githubData.login,
        envToken || undefined
      );

      setUserProfile(mapGitHubDataToProfile(githubData, repositories));
    } catch (err: unknown) {
      console.error("Failed to initialize GitHub profile:", err);
      setUserProfile(null);
      setError("Failed to load GitHub profile from .env settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<AuthContextType>(
    () => ({
      userProfile,
      loading,
      error,
      refreshProfile,
    }),
    [userProfile, loading, error, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
