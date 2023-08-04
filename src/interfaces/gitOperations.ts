export interface IGitOperations {
    excludeFiles: string[];
    mountPoint: string;
    repo: string;
    repoRecursive: boolean;
    branch: string;
    path: string;
}