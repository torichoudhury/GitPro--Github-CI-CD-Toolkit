export interface GitHubUserData {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
}

const ENV_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";

export const fetchGitHubUserData = async (
  username: string
): Promise<GitHubUserData | null> => {
  try {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      return null;
    }

    const encodedUsername = encodeURIComponent(trimmedUsername);
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitPro-App",
    };

    if (ENV_TOKEN) {
      headers["Authorization"] = `Bearer ${ENV_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/users/${encodedUsername}`, {
      headers,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GitHubUserData;
  } catch (error) {
    console.error("Error fetching GitHub user data:", error);
    return null;
  }
};

export const fetchGitHubRepositories = async (
  username: string,
  accessToken?: string
): Promise<GitHubRepository[]> => {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitPro-App",
    };

    const token = accessToken || ENV_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      return [];
    }

    const encodedUsername = encodeURIComponent(trimmedUsername);
    const response = await fetch(
      `https://api.github.com/users/${encodedUsername}/repos?sort=updated&per_page=100`,
      { headers }
    );

    if (!response.ok) {
      return [];
    }

    const repositories = (await response.json()) as GitHubRepository[];
    return repositories.filter((repo) => !repo.private || Boolean(token));
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    return [];
  }
};

export const checkGitHubRateLimit = async (): Promise<{
  limit: number;
  remaining: number;
  reset: number;
}> => {
  try {
    const response = await fetch("https://api.github.com/rate_limit");
    const data = await response.json();

    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: data.rate.reset,
    };
  } catch (error) {
    console.error("Error checking GitHub rate limit:", error);
    return { limit: 0, remaining: 0, reset: 0 };
  }
};
